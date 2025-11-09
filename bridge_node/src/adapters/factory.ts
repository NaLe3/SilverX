import { STTAdapter, LLMAdapter, TTSAdapter } from './types';
import { FakeSTT } from './fakes/fake_stt';
import { FakeLLM } from './fakes/fake_llm';
import { FakeTTS } from './fakes/fake_tts';

export function createSTTAdapter(): STTAdapter {
  const provider = process.env.STT_PROVIDER ?? 'fake';
  switch (provider) {
    case 'fake':
      return new FakeSTT();
    default:
      throw new Error(`STT provider not implemented: ${provider}`);
  }
}

export function createLLMAdapter(): LLMAdapter {
  const provider = process.env.LLM_PROVIDER ?? 'fake';
  switch (provider) {
    case 'fake':
      return new FakeLLM();
    default:
      throw new Error(`LLM provider not implemented: ${provider}`);
  }
}

export function createTTSAdapter(): TTSAdapter {
  const provider = process.env.TTS_PROVIDER ?? 'fake';
  switch (provider) {
    case 'fake':
      return new FakeTTS();
    default:
      throw new Error(`TTS provider not implemented: ${provider}`);
  }
}


