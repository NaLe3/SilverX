export type ProviderErrorCode =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'AUTH'
  | 'NETWORK'
  | 'PROVIDER'
  | 'CANCELLED';

export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly provider?: string;
  public readonly cause?: unknown;

  constructor(code: ProviderErrorCode, message: string, opts?: { provider?: string; cause?: unknown }) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.provider = opts?.provider;
    this.cause = opts?.cause;
  }
}

export class TimeoutError extends ProviderError {
  constructor(message = 'Operation timed out', opts?: { provider?: string; cause?: unknown }) {
    super('TIMEOUT', message, opts);
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(message = 'Rate limit exceeded', opts?: { provider?: string; cause?: unknown }) {
    super('RATE_LIMIT', message, opts);
    this.name = 'RateLimitError';
  }
}

export class AuthError extends ProviderError {
  constructor(message = 'Authentication failed', opts?: { provider?: string; cause?: unknown }) {
    super('AUTH', message, opts);
    this.name = 'AuthError';
  }
}

export class NetworkError extends ProviderError {
  constructor(message = 'Network error', opts?: { provider?: string; cause?: unknown }) {
    super('NETWORK', message, opts);
    this.name = 'NetworkError';
  }
}

export class CancelledError extends ProviderError {
  constructor(message = 'Operation cancelled', opts?: { provider?: string; cause?: unknown }) {
    super('CANCELLED', message, opts);
    this.name = 'CancelledError';
  }
}


