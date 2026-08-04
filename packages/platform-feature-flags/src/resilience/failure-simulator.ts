/**
 * Fault Injection Failure Simulator
 */

export type FailureScenario =
  | 'REDIS_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'WORKER_CRASH'
  | 'DUPLICATE_EVENTS'
  | 'NETWORK_DELAY'
  | 'QUEUE_CONGESTION'
  | 'CACHE_CORRUPTION'
  | 'ROLLOUT_FAILURE';

export class FailureSimulator {
  private activeFailures: Set<FailureScenario> = new Set();

  injectFailure(scenario: FailureScenario): void {
    this.activeFailures.add(scenario);
  }

  clearFailure(scenario: FailureScenario): void {
    this.activeFailures.delete(scenario);
  }

  clearAll(): void {
    this.activeFailures.clear();
  }

  isFailureActive(scenario: FailureScenario): boolean {
    return this.activeFailures.has(scenario);
  }
}
