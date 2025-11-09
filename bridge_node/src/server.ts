import 'dotenv/config';
import { createServer } from 'http';
import { URL } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createLLMAdapter, createTTSAdapter, createSTTAdapter } from './adapters/factory';
import type { ChatMessage, STTOptions } from './adapters/types';
import { withTimeout } from './adapters/timeout';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? '15000', 10);
const MAX_MESSAGE_BYTES = parseInt(process.env.MAX_MESSAGE_BYTES ?? '1000000', 10);
const BACKPRESSURE_LIMIT_BYTES = parseInt(process.env.BACKPRESSURE_LIMIT_BYTES ?? '5000000', 10);
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error';
const STT_PARTIAL_INTERVAL_MS = parseInt(process.env.STT_PARTIAL_INTERVAL_MS ?? '500', 10);
const MAX_INCOMING_BYTES = parseInt(process.env.MAX_INCOMING_BYTES ?? '10000000', 10); // 10MB par connexion
const MAX_WS_CONNECTIONS = parseInt(process.env.MAX_WS_CONNECTIONS ?? '2000', 10);
const AUTH_TOKEN = process.env.AUTH_TOKEN; // si absent → auth désactivée
const ALLOWED_WS_ORIGINS = (process.env.ALLOWED_WS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const RAILS_BASE_URL = process.env.RAILS_BASE_URL ?? 'http://rails:3000';
const RAILS_TIMEOUT_MS = parseInt(process.env.RAILS_TIMEOUT_MS ?? '4000', 10);

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
  path?: string;
}

// Adapters uniques (fakes par défaut via variables d'env)
const llmAdapter = createLLMAdapter();
const ttsAdapter = createTTSAdapter();
const sttAdapter = createSTTAdapter();

function safeJsonParse<T = unknown>(input: string): { ok: true; value: T } | { ok: false; error: Error } {
  try {
    return { ok: true, value: JSON.parse(input) as T };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}

function isOriginAllowed(originHeader?: string): boolean {
  if (!originHeader || ALLOWED_WS_ORIGINS.length === 0) return true;
  return ALLOWED_WS_ORIGINS.includes(originHeader);
}

function extractBearer(authHeader?: string | string[]): string | undefined {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!raw) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? m[1] : undefined;
}

function isAuthorized(url: URL, headers: import('http').IncomingHttpHeaders): boolean {
  if (!AUTH_TOKEN) return true;
  const tokenFromQuery = url.searchParams.get('token') ?? undefined;
  const tokenFromHeader = extractBearer(headers['authorization']);
  return tokenFromQuery === AUTH_TOKEN || tokenFromHeader === AUTH_TOKEN;
}

// Petite file asynchrone pour le streaming des chunks audio
class ChunkQueue {
  private chunks: Buffer[] = [];
  private resolvers: Array<(r: IteratorResult<Buffer>) => void> = [];
  private closed = false;
  enqueue(buf: Buffer): void {
    if (this.closed) return;
    if (this.resolvers.length > 0) {
      const r = this.resolvers.shift()!;
      r({ value: buf, done: false });
    } else {
      this.chunks.push(buf);
    }
  }
  close(): void {
    this.closed = true;
    while (this.resolvers.length > 0) {
      const r = this.resolvers.shift()!;
      r({ value: undefined as any, done: true });
    }
  }
  [Symbol.asyncIterator](): AsyncIterator<Buffer> {
    return {
      next: (): Promise<IteratorResult<Buffer>> => {
        if (this.chunks.length > 0) {
          const v = this.chunks.shift()!;
          return Promise.resolve({ value: v, done: false });
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined as any, done: true });
        }
        return new Promise<IteratorResult<Buffer>>((resolve) => this.resolvers.push(resolve));
      }
    };
  }
}

const httpServer = createServer();

// Endpoints HTTP de santé/metrics
httpServer.on('request', (req, res) => {
  const method = req.method || 'GET';
  const urlStr = req.url || '/';
  const url = new URL(urlStr, `http://localhost:${PORT}`);
  if (method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/readyz')) {
    const body = JSON.stringify({
      status: 'ok',
      clients: wss.clients.size,
      maxClients: MAX_WS_CONNECTIONS,
      uptimeSec: Math.floor(process.uptime())
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(body);
    return;
  }
  res.writeHead(404);
  res.end();
});

// Important: noServer=true pour gérer manuellement l'upgrade et filtrer le chemin
const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: MAX_MESSAGE_BYTES
});

wss.on('connection', (ws: ExtWebSocket, request) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  ws.path = url.pathname;
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
    // ROUTAGE par chemin
    if (ws.path === '/stt_stream') {
      // Streaming STT: on attend des chunks binaires; on peut recevoir un message JSON {type:"stt_end"} pour fermer
      handleSttStreamMessage(ws, data, isBinary, url);
      return;
    }
    // /stream par défaut
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
    const parsed = safeJsonParse<{ type?: string; text?: string; format?: 'pcm16' | 'wav' | 'mp3'; tool?: string; payload?: unknown }>(text);
    if (!parsed.ok || !parsed.value) {
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
    // Tool dispatch
    if (parsed.value.type === 'tool_dispatch' && parsed.value.tool) {
      (async () => {
        try {
          const result = await railsToolDispatch(parsed.value.tool as string, parsed.value.payload);
          ws.send(JSON.stringify({ type: 'tool_result', ok: true, tool: parsed.value.tool, result }), { binary: false }, () => {});
        } catch (e) {
          const err = e as Error;
          ws.send(JSON.stringify({ type: 'tool_result', ok: false, tool: parsed.value.tool, error: err.message }), { binary: false }, () => {});
        }
      })().catch(() => {});
      return;
    }
    // Chat → TTS
    if (parsed.value.type !== 'chat_tts' || !parsed.value.text) {
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
        // Persistance minimale côté Rails (best-effort)
        persistChatTts(callId, userText, replyText).catch((e) => {
          log('warn', 'rails_persist_error', { call_id: callId, error: (e as Error).message });
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

function parseSttOptionsFromUrl(url: URL): STTOptions {
  const language = url.searchParams.get('language') ?? undefined;
  const encoding = (url.searchParams.get('encoding') as STTOptions['encoding']) ?? undefined;
  const sr = url.searchParams.get('sample_rate_hz');
  const sampleRateHz = sr ? parseInt(sr, 10) : undefined;
  return { language, encoding, sampleRateHz, timeoutMs: 20_000 };
}

function handleSttStreamMessage(ws: ExtWebSocket, data: WebSocket.RawData, isBinary: boolean, url: URL): void {
  // State par connexion (mémorisé via WeakMap)
  const state = getOrInitSttState(ws, url);
  if (isBinary) {
    const buf = data as Buffer;
    state.totalBytes += buf.byteLength;
    if (state.totalBytes > MAX_INCOMING_BYTES) {
      log('warn', 'stt_incoming_limit', { call_id: ws.callId, totalBytes: state.totalBytes });
      try {
        ws.close(1009, 'incoming too large');
      } catch {
        // ignore
      }
      state.queue.close();
      return;
    }
    state.queue.enqueue(buf);
    // Partiels throttlés
    const now = Date.now();
    if (now - state.lastPartialAt >= STT_PARTIAL_INTERVAL_MS) {
      state.lastPartialAt = now;
      const partial = JSON.stringify({ type: 'stt_partial', bytes: state.totalBytes, text: `[partial bytes=${state.totalBytes}]` });
      try {
        ws.send(partial, { binary: false }, () => {});
      } catch {
        // ignore
      }
    }
    return;
  }
  // message texte → protocole de contrôle
  const text = String(data);
  const parsed = safeJsonParse<{ type?: string }>(text);
  if (parsed.ok && parsed.value?.type === 'stt_end') {
    state.queue.close();
    return;
  }
  // Sinon, ignorer ou écho
  try {
    ws.send(text, { binary: false }, () => {});
  } catch {
    // ignore
  }
}

type SttState = {
  queue: ChunkQueue;
  lastPartialAt: number;
  totalBytes: number;
  started: boolean;
};
const sttStates = new WeakMap<ExtWebSocket, SttState>();

function getOrInitSttState(ws: ExtWebSocket, url: URL): SttState {
  let st = sttStates.get(ws);
  if (st) return st;
  st = { queue: new ChunkQueue(), lastPartialAt: 0, totalBytes: 0, started: false };
  sttStates.set(ws, st);
  // Démarre le worker STT (une fois)
  const options = parseSttOptionsFromUrl(url);
  const startedAt = Date.now();
  const ac = new AbortController();
  ws.once('close', () => ac.abort());
  (async () => {
    try {
      log('info', 'stt_stream_start', { call_id: ws.callId, language: options.language, encoding: options.encoding, sampleRateHz: options.sampleRateHz });
      const result = await sttAdapter.transcribeStream(st.queue, options, ac.signal);
      const latencyMs = Date.now() - startedAt;
      const meta = JSON.stringify({ type: 'stt_final', text: result.text, confidence: result.confidence, durationMs: result.durationMs, latencyMs });
      try {
        ws.send(meta, { binary: false }, () => {});
      } catch {
        // ignore
      }
      log('info', 'stt_stream_end', { call_id: ws.callId, totalBytes: st.totalBytes, latencyMs, confidence: result.confidence });
    } catch (e) {
      const err = e as Error;
      log('warn', 'stt_stream_error', { call_id: ws.callId, error: err.message });
      try {
        ws.send(JSON.stringify({ type: 'stt_error', error: err.message }), { binary: false }, () => {});
      } catch {
        // ignore
      }
    }
  })().catch(() => {});
  return st;
}

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
  // Limite connexions globales
  if (wss.clients.size >= MAX_WS_CONNECTIONS) {
    socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
    socket.destroy();
    return;
  }
  // Contrôle d'origine
  const origin = req.headers['origin'] as string | undefined;
  if (!isOriginAllowed(origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  // Auth
  const url = new URL(path, `http://localhost:${PORT}`);
  if (!isAuthorized(url, req.headers)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  if (!(path.startsWith('/stream') || path.startsWith('/stt_stream'))) {
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

// ----------------
// Rails integration
// ----------------
async function fetchJson(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: unknown; timeoutMs?: number }
): Promise<any> {
  const method = opts.method ?? 'GET';
  const headers = opts.headers ?? {};
  const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), opts.timeoutMs ?? RAILS_TIMEOUT_MS);
  try {
    const res = await (globalThis as any).fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: bodyStr,
      signal: ac.signal
    });
    const txt = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
    }
    try {
      return JSON.parse(txt);
    } catch {
      return txt;
    }
  } finally {
    clearTimeout(to);
  }
}

async function persistChatTts(callId: string, userText: string, assistantText: string): Promise<void> {
  // Crée un Call à chaque interaction (external_id suffixé pour éviter le conflit unique)
  const externalId = `${callId}-${Date.now()}`;
  const call = await withTimeout(
    fetchJson(`${RAILS_BASE_URL}/calls`, {
      method: 'POST',
      body: { external_id: externalId, status: 'active', metadata: { source: 'bridge' } }
    }),
    RAILS_TIMEOUT_MS
  );
  const id = call.id;
  if (!id) return;
  // Message user
  await withTimeout(
    fetchJson(`${RAILS_BASE_URL}/calls/${id}/messages`, {
      method: 'POST',
      body: { role: 'user', content: userText, metadata: { via: 'bridge' } }
    }),
    RAILS_TIMEOUT_MS
  );
  // Message assistant
  await withTimeout(
    fetchJson(`${RAILS_BASE_URL}/calls/${id}/messages`, {
      method: 'POST',
      body: { role: 'assistant', content: assistantText, metadata: { via: 'bridge' } }
    }),
    RAILS_TIMEOUT_MS
  );
}

async function railsToolDispatch(tool: string, payload: unknown): Promise<any> {
  const res = await withTimeout(
    fetchJson(`${RAILS_BASE_URL}/tools/dispatch`, {
      method: 'POST',
      body: { tool, payload }
    }),
    RAILS_TIMEOUT_MS
  );
  return res;
}

