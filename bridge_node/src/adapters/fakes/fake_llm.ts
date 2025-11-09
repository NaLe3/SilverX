import { ChatMessage, LLMAdapter, LLMOptions, LLMResult } from '../types';
import { withTimeout } from '../timeout';
import { defaultBehavior, simulate } from './fake_util';

export class FakeLLM implements LLMAdapter {
  private readonly behavior = defaultBehavior('FAKE_LLM');

  async complete(messages: ChatMessage[], options?: LLMOptions, signal?: AbortSignal): Promise<LLMResult> {
    const run = async () =>
      simulate<LLMResult>(
        () => {
          const lastUser = [...messages].reverse().find((m) => m.role === 'user');
          const content = lastUser ? `Echo: ${lastUser.content}` : 'Hello from FakeLLM';
          const completion: ChatMessage = { role: 'assistant', content };
          const promptTokens = messages.reduce((acc, m) => acc + m.content.split(/\s+/).length, 0);
          const completionTokens = completion.content.split(/\s+/).length;
          return {
            message: completion,
            usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
            latencyMs: undefined
          };
        },
        this.behavior,
        signal
      );
    const timeoutMs = options?.timeoutMs ?? 7_000;
    return withTimeout(run(), timeoutMs, signal);
  }
}


