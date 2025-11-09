import { TTSAdapter, TTSOptions, TTSResult } from '../types';
import { withTimeout } from '../timeout';
import { defaultBehavior, simulate } from './fake_util';

export class FakeTTS implements TTSAdapter {
  private readonly behavior = defaultBehavior('FAKE_TTS');

  async synthesize(text: string, options?: TTSOptions, signal?: AbortSignal): Promise<TTSResult> {
    const run = async () =>
      simulate<TTSResult>(
        () => {
          // Simule un audio PCM "factice": taille proportionnelle au nombre de caractères
          const factor = 50; // bytes per char (arbitraire, juste pour simuler de la taille)
          const size = Math.max(2000, text.length * factor);
          const audio = Buffer.alloc(size, 0);
          const format = options?.format ?? 'pcm16';
          const mimeType = format === 'wav' ? 'audio/wav' : format === 'mp3' ? 'audio/mpeg' : 'audio/pcm';
          return { audio, mimeType, durationMs: Math.round(size / ((options?.sampleRateHz ?? 16000) / 10)) };
        },
        this.behavior,
        signal
      );
    const timeoutMs = options?.timeoutMs ?? 5_000;
    return withTimeout(run(), timeoutMs, signal);
  }
}


