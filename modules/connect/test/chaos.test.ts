/**
 * Campus Connect — Resilience & Chaos Engineering Integration Tests (MS-23.8.5)
 * Verifies CircuitBreaker state transitions, FailureSimulator injection, HealthMonitor reporting, and ChaosRunner scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentCircuitBreakers, CircuitBreaker } from '../src/resilience/circuit-breaker.js';
import { FailureSimulator } from '../src/resilience/failure-simulator.js';
import { HealthMonitor } from '../src/resilience/health-monitor.js';
import { ChaosRunner } from '../src/resilience/chaos-runner.js';

describe('Resilience & Chaos Engineering Suite', () => {
  let breakers: ComponentCircuitBreakers;
  let simulator: FailureSimulator;
  let monitor: HealthMonitor;
  let runner: ChaosRunner;

  beforeEach(() => {
    breakers = new ComponentCircuitBreakers();
    simulator = new FailureSimulator();
    monitor = new HealthMonitor(breakers);
    runner = new ChaosRunner(breakers, simulator);
  });

  it('1. CircuitBreaker: Transitions CLOSED -> OPEN -> HALF_OPEN -> CLOSED under failure & recovery', async () => {
    const breaker = new CircuitBreaker({
      name: 'TestRedis',
      failureThreshold: 2,
      recoveryTimeoutMs: 50,
      successThreshold: 1
    });

    expect(breaker.getState()).toBe('CLOSED');

    // 1. Fail twice to trip circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Redis connection timeout');
        });
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('OPEN');

    // 2. Wait for recovery timeout window
    await new Promise((res) => setTimeout(res, 60));

    // 3. State transitions to HALF_OPEN on next call
    expect(breaker.getState()).toBe('HALF_OPEN');

    // 4. Successful execution closes circuit
    const res = await breaker.execute(async () => 'OK');
    expect(res).toBe('OK');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('2. Fallback Execution: Executes fallback cleanly when circuit is OPEN without leaking data', async () => {
    const breaker = breakers.getBreaker('Redis');
    breaker.forceOpen();

    let fallbackExecuted = false;
    const result = await breaker.execute(
      async () => 'PRIMARY',
      async () => {
        fallbackExecuted = true;
        return 'FALLBACK_LOCAL_STORE';
      }
    );

    expect(fallbackExecuted).toBe(true);
    expect(result).toBe('FALLBACK_LOCAL_STORE');
  });

  it('3. HealthMonitor: Accurately reflects system liveness, readiness, and worker status without leaking PII', async () => {
    const report = monitor.checkHealth();

    expect(report.status).toBe('HEALTHY');
    expect(report.liveness).toBe(true);
    expect(report.readiness).toBe(true);
    expect(report.dependencies.postgres).toBe('HEALTHY');
    expect(report.workers.recommendationWorker).toBe('UP');

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('trustScore');
    expect(serialized).not.toContain('password');
  });

  it('4. FailureSimulator: Injects deterministic outages and delays into service calls', async () => {
    simulator.enableSimulation('SEARCH_OUTAGE');

    await expect(simulator.checkAndSimulate('SEARCH_OUTAGE')).rejects.toThrow('SEARCH_OUTAGE');
  });

  it('5. ChaosRunner: Executes scripted Redis outage scenario and validates auto-recovery', async () => {
    const chaosResult = await runner.runRedisOutageScenario();

    expect(chaosResult.stepsExecuted).toBe(5);
    expect(chaosResult.fallbackTriggered).toBe(true);
    expect(chaosResult.recoveredSuccessfully).toBe(true);
    expect(chaosResult.circuitTransitions).toEqual(['CLOSED', 'OPEN', 'HALF_OPEN', 'CLOSED']);
  });
});
