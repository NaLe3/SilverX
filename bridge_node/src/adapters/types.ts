export interface STTOptions {
  language?: string; // e.g. 'fr-FR'
  sampleRateHz?: number; // e.g. 8000, 16000
  encoding?: 'pcm16' | 'mulaw' | 'ogg' | 'wav';
  timeoutMs?: number;
}

export interface STTResult {
  text: string;
  confidence?: number; // 0..1
  durationMs?: number;
}

export interface STTAdapter {
  transcribeBatch(audio: Buffer, options?: STTOptions, signal?: AbortSignal): Promise<STTResult>;
  transcribeStream(
    chunks: AsyncIterable<Buffer>,
    options?: STTOptions,
    signal?: AbortSignal
  ): Promise<STTResult>;
}

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  // tool-call id, function name/args pourraient être ajoutés plus tard
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LLMResult {
  message: ChatMessage;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  latencyMs?: number;
}

export interface LLMAdapter {
  complete(messages: ChatMessage[], options?: LLMOptions, signal?: AbortSignal): Promise<LLMResult>;
}

export interface TTSOptions {
  voice?: string;
  format?: 'pcm16' | 'wav' | 'mp3';
  sampleRateHz?: number;
  timeoutMs?: number;
}

export interface TTSResult {
  audio: Buffer;
  mimeType: string; // e.g. 'audio/wav' | 'audio/pcm'
  durationMs?: number;
}

export interface TTSAdapter {
  synthesize(text: string, options?: TTSOptions, signal?: AbortSignal): Promise<TTSResult>;
}


