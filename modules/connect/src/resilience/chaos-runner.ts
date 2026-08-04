/**
 * Campus Connect — Chaos Runner
 * Executes scripted multi-step chaos engineering scenarios verifying circuit state transitions and automatic recovery.
 */

import { ComponentCircuitBreakers } from './circuit-breaker.js';
import { FailureSimulator } from './failure-simulator.js';

export interface ChaosResult {
  scenarioName: string;
  stepsExecuted: number;
  circuitTransitions: string[];
  fallbackTriggered: boolean;
  recoveredSuccessfully: boolean;
}

export class ChaosRunner {
  constructor(
    private readonly circuitBreakers: ComponentCircuitBreakers,
    private readonly failureSimulator: FailureSimulator
  ) {}

  async runRedisOutageScenario(): Promise<ChaosResult> {
    const breaker = this.circuitBreakers.getBreaker('Redis');
    breaker.reset();

    const transitions: string[] = [breaker.getState()];
    let fallbackTriggered = false;

    // Step 1: Simulate Redis Down
    this.failureSimulator.enableSimulation('REDIS_UNAVAILABLE');

    // Step 2: Issue requests causing failures to trip circuit
    for (let i = 0; i < breaker.config.failureThreshold; i++) {
      try {
        await breaker.execute(
          async () => {
            await this.failureSimulator.checkAndSimulate('REDIS_UNAVAILABLE');
            return 'OK';
          },
          async () => {
            fallbackTriggered = true;
            return 'FALLBACK_LOCAL_CACHE';
          }
        );
      } catch {
        // Ignored during trial
      }
    }

    transitions.push(breaker.getState()); // Should be OPEN

    // Step 3: Redis Recovers
    this.failureSimulator.disableSimulation('REDIS_UNAVAILABLE');

    // Wait for recovery timeout window
    await new Promise((res) => setTimeout(res, breaker.config.recoveryTimeoutMs + 50));

    // Step 4: Trial request transitions to HALF_OPEN
    await breaker.execute(async () => 'OK');
    transitions.push(breaker.getState()); // HALF_OPEN

    // Step 5: Second successful request closes circuit
    await breaker.execute(async () => 'OK');
    transitions.push(breaker.getState()); // CLOSED

    return {
      scenarioName: 'Redis Outage & Recovery',
      stepsExecuted: 5,
      circuitTransitions: transitions,
      fallbackTriggered,
      recoveredSuccessfully: breaker.getState() === 'CLOSED'
    };
  }
}
