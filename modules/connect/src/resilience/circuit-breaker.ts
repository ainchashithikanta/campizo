/**
 * Campus Connect — Circuit Breaker Implementation
 * Manages operational resilience across PostgreSQL, Redis, Search Index, Notification Queue, and Recommendation Engine.
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED. Supports failure thresholds, timeout windows, automatic recovery & fallbacks.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Consecutive failures before opening
  recoveryTimeoutMs: number; // Cooldown duration in OPEN state before transitioning to HALF_OPEN
  successThreshold: number; // Consecutive successes in HALF_OPEN to close circuit
}

export const DEFAULT_CIRCUIT_CONFIGS: Record<string, CircuitBreakerConfig> = {
  PostgreSQL: { name: 'PostgreSQL', failureThreshold: 3, recoveryTimeoutMs: 1000, successThreshold: 2 },
  Redis: { name: 'Redis', failureThreshold: 3, recoveryTimeoutMs: 500, successThreshold: 2 },
  SearchIndex: { name: 'SearchIndex', failureThreshold: 3, recoveryTimeoutMs: 500, successThreshold: 2 },
  NotificationQueue: { name: 'NotificationQueue', failureThreshold: 3, recoveryTimeoutMs: 500, successThreshold: 2 },
  RecommendationEngine: {
    name: 'RecommendationEngine',
    failureThreshold: 3,
    recoveryTimeoutMs: 1000,
    successThreshold: 2
  }
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastStateChangeTime: number = Date.now();

  constructor(public readonly config: CircuitBreakerConfig) {}

  getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  private checkStateTransition(): void {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastStateChangeTime;
      if (elapsed >= this.config.recoveryTimeoutMs) {
        this.transitionTo('HALF_OPEN');
        this.successCount = 0;
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChangeTime = Date.now();
  }

  async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallback) {
        return fallback();
      }
      throw new Error(`CircuitBreaker '${this.config.name}' is OPEN. Request rejected.`);
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
    } else if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.transitionTo('CLOSED');
  }

  forceOpen(): void {
    this.transitionTo('OPEN');
  }
}

export class ComponentCircuitBreakers {
  private breakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    for (const [key, cfg] of Object.entries(DEFAULT_CIRCUIT_CONFIGS)) {
      this.breakers.set(key, new CircuitBreaker(cfg));
    }
  }

  getBreaker(name: string): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker({ name, failureThreshold: 3, recoveryTimeoutMs: 1000, successThreshold: 2 });
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}
