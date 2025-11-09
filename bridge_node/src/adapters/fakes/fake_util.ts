import { delay } from '../timeout';
import { ProviderError } from '../errors';

export interface FakeBehavior {
  minLatencyMs?: number;
  maxLatencyMs?: number;
  failureRate?: number; // 0..1
}

export function getEnvNumber(name: string, def: number): number {
  const raw = process.env[name];
  if (!raw) return def;
  const n = Number(raw);
  return Number.isFinite(n) ? n : def;
}

export function getEnvRate(name: string, def: number): number {
  const raw = process.env[name];
  if (!raw) return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function defaultBehavior(prefix: string): FakeBehavior {
  const minLatencyMs = getEnvNumber(`${prefix}_MIN_LATENCY_MS`, 50);
  const maxLatencyMs = getEnvNumber(`${prefix}_MAX_LATENCY_MS`, 150);
  const failureRate = getEnvRate(`${prefix}_FAILURE_RATE`, 0);
  return { minLatencyMs, maxLatencyMs, failureRate };
}

export async function simulate<T>(
  work: () => T | Promise<T>,
  behavior: FakeBehavior,
  signal?: AbortSignal
): Promise<T> {
  const min = behavior.minLatencyMs ?? 50;
  const max = behavior.maxLatencyMs ?? 150;
  const jitter = min + Math.floor(Math.random() * Math.max(0, max - min + 1));
  await delay(jitter, signal);
  if (behavior.failureRate && Math.random() < behavior.failureRate) {
    throw new ProviderError('PROVIDER', 'Injected failure (fake provider)');
  }
  return await work();
}


