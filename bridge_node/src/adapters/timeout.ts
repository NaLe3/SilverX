import { CancelledError, TimeoutError } from './errors';

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new CancelledError('Aborted before delay'));
    const t = setTimeout(() => resolve(), ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new CancelledError('Aborted during delay'));
    };
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal
): Promise<T> {
  if (ms <= 0) return promise;
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(`Timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal?.aborted) {
      // surface cancellation separately if caller needs it
    }
  }
}


