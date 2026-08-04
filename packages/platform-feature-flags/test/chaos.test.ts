import { describe, it, expect, beforeEach } from 'vitest';
import {
  FailureSimulator,
  ChaosRunner,
  CircuitBreaker,
  HealthMonitor
} from '../src/index.js';

describe('Platform Feature Flags — Production Chaos & Circuit Breaker Verification', () => {

  let simulator: FailureSimulator;
  let runner: ChaosRunner;

  beforeEach(() => {
    simulator = new FailureSimulator();
    runner = new ChaosRunner(simulator);
  });

  it('1. Circuit Breaker: CLOSED -> OPEN -> HALF_OPEN automatic state transitions', async () => {
    const cb = new CircuitBreaker('RedisBreaker', { failureThreshold: 2, resetTimeoutMs: 50 });

    expect(cb.getState()).toBe('CLOSED');

    // Trigger 2 failures
    await cb.execute(async () => { throw new Error('Redis connection dropped'); }, () => 'fallback');
    await cb.execute(async () => { throw new Error('Redis connection dropped'); }, () => 'fallback');

    expect(cb.getState()).toBe('OPEN');

    // Fast-forward wait for reset timeout
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.getState()).toBe('HALF_OPEN');

    // Successful attempt resets to CLOSED
    const val = await cb.execute(async () => 'success', () => 'fallback');
    expect(val).toBe('success');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('2. Chaos Runner: should execute fault injection scenario and recover safely', async () => {
    const res = await runner.runScenario('REDIS_UNAVAILABLE', async () => {
      // Local fallback evaluation logic
      expect(simulator.isFailureActive('REDIS_UNAVAILABLE')).toBe(true);
    });

    expect(res.recovered).toBe(true);
    expect(res.scenario).toBe('REDIS_UNAVAILABLE');
    expect(simulator.isFailureActive('REDIS_UNAVAILABLE')).toBe(false);
  });

  it('3. Health Monitor: should report DEGRADED when Redis is unavailable', () => {
    const monitor = new HealthMonitor();
    const report = monitor.getSystemHealthReport(false, true, 0.20);
    expect(report.status).toBe('DEGRADED');
    expect(report.redisConnected).toBe(false);
  });
});
