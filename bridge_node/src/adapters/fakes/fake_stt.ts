import { STTAdapter, STTOptions, STTResult } from '../types';
import { withTimeout } from '../timeout';
import { defaultBehavior, simulate } from './fake_util';

export class FakeSTT implements STTAdapter {
  private readonly behavior = defaultBehavior('FAKE_STT');

  async transcribeBatch(audio: Buffer, options?: STTOptions, signal?: AbortSignal): Promise<STTResult> {
    const run = async () =>
      simulate<STTResult>(
        () => {
          const bytes = audio.byteLength;
          const text = `[fake-stt:${options?.language ?? 'und'} bytes=${bytes}]`;
          return { text, confidence: 0.9, durationMs: Math.round(bytes / (options?.sampleRateHz ?? 16000)) };
        },
        this.behavior,
        signal
      );
    const timeoutMs = options?.timeoutMs ?? 5_000;
    return withTimeout(run(), timeoutMs, signal);
  }

  async transcribeStream(
    chunks: AsyncIterable<Buffer>,
    options?: STTOptions,
    signal?: AbortSignal
  ): Promise<STTResult> {
    const run = async () => {
      let total = 0;
      for await (const c of chunks) {
        if (signal?.aborted) break;
        total += c.byteLength;
      }
      return simulate<STTResult>(
        () => {
          const text = `[fake-stt-stream:${options?.language ?? 'und'} bytes=${total}]`;
          return { text, confidence: 0.88, durationMs: Math.round(total / (options?.sampleRateHz ?? 16000)) };
        },
        this.behavior,
        signal
      );
    };
    const timeoutMs = options?.timeoutMs ?? 10_000;
    return withTimeout(run(), timeoutMs, signal);
  }
}


