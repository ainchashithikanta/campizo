/**
 * Resilience Circuit Breaker
 * Protects Redis, Database, Telemetry, and Notification dependencies during infrastructure degradation.
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private nextAttemptTimestamp: number = 0;

  constructor(
    public readonly name: string,
    private readonly config: CircuitBreakerConfig = { failureThreshold: 3, resetTimeoutMs: 1000 }
  ) {}

  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() > this.nextAttemptTimestamp) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  async execute<T>(action: () => Promise<T>, fallback: () => T): Promise<T> {
    const current = this.getState();
    if (current === 'OPEN') {
      return fallback();
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      return fallback();
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTimestamp = Date.now() + this.config.resetTimeoutMs;
    }
  }

  forceReset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }
}
