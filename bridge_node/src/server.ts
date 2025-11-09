import 'dotenv/config';
import { createServer } from 'http';
import { URL } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createLLMAdapter, createTTSAdapter } from './adapters/factory';
import type { ChatMessage } from './adapters/types';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? '15000', 10);
const MAX_MESSAGE_BYTES = parseInt(process.env.MAX_MESSAGE_BYTES ?? '1000000', 10);
const BACKPRESSURE_LIMIT_BYTES = parseInt(process.env.BACKPRESSURE_LIMIT_BYTES ?? '5000000', 10);
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const levelWeight: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level: LogLevel, event: string, data: Record<string, unknown> = {}): void {
  if (levelWeight[level] < levelWeight[LOG_LEVEL]) return;
  const line = { ts: new Date().toISOString(), level, event, ...data };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}

interface ExtWebSocket extends WebSocket {
  isAlive?: boolean;
  callId?: string;
  connectedAt?: number;
}

// Adapters uniques (fakes par défaut via variables d'env)
const llmAdapter = createLLMAdapter();
const ttsAdapter = createTTSAdapter();

function safeJsonParse<T = unknown>(input: string): { ok: true; value: T } | { ok: false; error: Error } {
  try {
    return { ok: true, value: JSON.parse(input) as T };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}

const httpServer = createServer();

// Important: noServer=true pour gérer manuellement l'upgrade et filtrer le chemin
const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: MAX_MESSAGE_BYTES
});

wss.on('connection', (ws: ExtWebSocket, request) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const callId = url.searchParams.get('call_id') ?? 'unknown';
  ws.callId = callId;
  ws.isAlive = true;
  ws.connectedAt = Date.now();

  log('info', 'ws_connected', { call_id: callId, ip: request.socket.remoteAddress });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data, isBinary) => {
    const size = isBinary ? (data as Buffer).byteLength : Buffer.byteLength(String(data));
    if ((ws as WebSocket).bufferedAmount > BACKPRESSURE_LIMIT_BYTES) {
      log('warn', 'backpressure_drop', { call_id: callId, buffered: (ws as WebSocket).bufferedAmount, size });
      return;
    }
    // Si binaire: echo direct
    if (isBinary) {
      try {
        ws.send(data, { binary: true }, (err) => {
          if (err) {
            log('error', 'send_error', { call_id: callId, error: err.message });
            ws.close(1011, 'send failure');
          }
        });
      } catch (e) {
        const err = e as Error;
        log('error', 'send_exception', { call_id: callId, error: err.message });
      }
      return;
    }
    // Texte: tenter un message JSON protocolaire
    const text = String(data);
    const parsed = safeJsonParse<{ type?: string; text?: string; format?: 'pcm16' | 'wav' | 'mp3' }>(text);
    if (!parsed.ok || !parsed.value || parsed.value.type !== 'chat_tts' || !parsed.value.text) {
      // Pas notre protocole → echo texte
      try {
        ws.send(text, { binary: false }, (err) => {
          if (err) {
            log('error', 'send_error', { call_id: callId, error: err.message });
            ws.close(1011, 'send failure');
          }
        });
      } catch (e) {
        const err = e as Error;
        log('error', 'send_exception', { call_id: callId, error: err.message });
      }
      return;
    }
    // Pipeline: USER TEXT → LLM (fake) → TTS (fake) → JSON meta + AUDIO binaire
    (async () => {
      const userText = parsed.value.text as string;
      const format = parsed.value.format ?? 'pcm16';
      log('info', 'chat_tts_start', { call_id: callId, format });
      try {
        const messages: ChatMessage[] = [{ role: 'user', content: userText }];
        const llmRes = await llmAdapter.complete(messages, { timeoutMs: 7000 });
        const replyText = llmRes.message.content;
        const ttsRes = await ttsAdapter.synthesize(replyText, { format, timeoutMs: 5000 });
        const meta = JSON.stringify({
          type: 'chat_tts_result',
          text: replyText,
          mimeType: ttsRes.mimeType,
          bytes: ttsRes.audio.byteLength
        });
        ws.send(meta, { binary: false }, (err) => {
          if (err) {
            log('error', 'send_error', { call_id: callId, error: err.message });
            ws.close(1011, 'send failure');
          }
        });
        ws.send(ttsRes.audio, { binary: true }, (err) => {
          if (err) {
            log('error', 'send_error', { call_id: callId, error: err.message });
            ws.close(1011, 'send failure');
          }
        });
        log('info', 'chat_tts_done', { call_id: callId, bytes: ttsRes.audio.byteLength });
      } catch (e) {
        const err = e as Error;
        log('warn', 'chat_tts_error', { call_id: callId, error: err.message });
        const meta = JSON.stringify({ type: 'chat_tts_error', error: err.message });
        try {
          ws.send(meta, { binary: false }, () => {});
        } catch {
          // ignore
        }
      }
    })().catch(() => {
      // déjà loggé
    });
  });

  ws.on('close', (code, reason) => {
    const durationMs = Date.now() - (ws.connectedAt ?? Date.now());
    log('info', 'ws_closed', { call_id: callId, code, reason: reason.toString(), duration_ms: durationMs });
  });

  ws.on('error', (err) => {
    log('warn', 'ws_error', { call_id: callId, error: (err as Error).message });
  });
});

// Heartbeat (ping/pong)
const heartbeat = setInterval(() => {
  wss.clients.forEach((socket) => {
    const ws = socket as ExtWebSocket;
    if (ws.isAlive === false) {
      log('warn', 'ws_terminate_idle', { call_id: ws.callId });
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (e) {
      const err = e as Error;
      log('warn', 'ping_error', { call_id: ws.callId, error: err.message });
      ws.terminate();
    }
  });
}, HEARTBEAT_INTERVAL_MS);

// Upgrade HTTP -> WS: n'accepte que /stream
httpServer.on('upgrade', (req, socket, head) => {
  const path = req.url ?? '/';
  if (!path.startsWith('/stream')) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

httpServer.listen(PORT, () => {
  log('info', 'bridge_started', { port: PORT });
});

process.on('SIGTERM', () => {
  log('info', 'sigterm', {});
  clearInterval(heartbeat);
  httpServer.close(() => {
    log('info', 'http_server_closed', {});
    wss.close(() => {
      log('info', 'wss_closed', {});
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(0), 5000).unref();
});

