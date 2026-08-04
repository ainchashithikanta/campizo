/**
 * Campus Connect — Exponential Backoff Retry Policy
 * Calculates delay intervals with jitter and maximum retry attempt limits for BullMQ workers.
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitter: true
};

export class RetryPolicy {
  constructor(private readonly config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  shouldRetry(attemptCount: number): boolean {
    return attemptCount < this.config.maxRetries;
  }

  calculateDelayMs(attemptCount: number): number {
    let delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attemptCount - 1);
    delay = Math.min(delay, this.config.maxDelayMs);

    if (this.config.jitter) {
      const jitterFactor = 0.5 + Math.random() * 0.5;
      delay = Math.floor(delay * jitterFactor);
    }

    return delay;
  }
}
