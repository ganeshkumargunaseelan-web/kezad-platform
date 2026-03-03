/**
 * Top-class retry utility with exponential backoff + jitter.
 * Used for all external adapter calls (CRM, ERP, SCADA, BMS, etc.)
 */

export interface RetryOptions {
  maxAttempts?: number;         // default 3
  initialDelayMs?: number;      // default 1000ms
  maxDelayMs?: number;          // default 30000ms
  backoffMultiplier?: number;   // default 2
  jitter?: boolean;             // default true — adds ±30% random jitter
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  shouldRetry?: (error: Error) => boolean; // default: retry on 5xx / network errors
}

export class RetryExhaustedError extends Error {
  constructor(
    public readonly lastError: Error,
    public readonly attempts: number,
  ) {
    super(`Failed after ${attempts} attempt(s): ${lastError.message}`);
    this.name = 'RetryExhaustedError';
  }
}

/**
 * Execute an async operation with retry logic.
 * @example
 *   const result = await withRetry(() => fetchFromApi(), { maxAttempts: 3 });
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitter = true,
    onRetry,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw new RetryExhaustedError(lastError, attempt);
      }

      const baseDelay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs,
      );
      const delayMs = jitter
        ? baseDelay * (0.7 + Math.random() * 0.6) // ±30% jitter
        : baseDelay;

      onRetry?.(attempt, lastError, delayMs);

      await sleep(delayMs);
    }
  }

  throw new RetryExhaustedError(lastError, maxAttempts);
}

function defaultShouldRetry(error: Error): boolean {
  // Retry on network errors and 5xx-equivalent errors
  const message = error.message.toLowerCase();
  return (
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('504')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Circuit breaker state.
 * Opens after N failures and allows a test request after cooldown.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureAt: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly maxFailures: number = 5,
    private readonly cooldownMs: number = 30000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - (this.lastFailureAt ?? 0);
      if (elapsed < this.cooldownMs) {
        throw new Error(`Circuit breaker is open. Cooldown: ${Math.ceil((this.cooldownMs - elapsed) / 1000)}s`);
      }
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureAt = Date.now();
    if (this.failures >= this.maxFailures) {
      this.state = 'open';
    }
  }

  get isOpen(): boolean {
    return this.state === 'open';
  }
}
