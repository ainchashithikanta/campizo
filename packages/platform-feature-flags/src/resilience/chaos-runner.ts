/**
 * Chaos Engineering Test Runner
 */

import { FailureSimulator, FailureScenario } from './failure-simulator.js';

export interface ChaosRunResult {
  scenario: FailureScenario;
  recovered: boolean;
  recoveryDurationMs: number;
  auditNote: string;
}

export class ChaosRunner {
  constructor(private readonly simulator: FailureSimulator) {}

  async runScenario(scenario: FailureScenario, task: () => Promise<void>): Promise<ChaosRunResult> {
    const start = performance.now();
    this.simulator.injectFailure(scenario);

    let recovered = false;
    let auditNote = '';

    try {
      await task();
      recovered = true;
      auditNote = `Successfully recovered from fault '${scenario}'.`;
    } catch (err) {
      recovered = false;
      auditNote = `Failed under fault '${scenario}': ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      this.simulator.clearFailure(scenario);
    }

    const recoveryDurationMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      scenario,
      recovered,
      recoveryDurationMs,
      auditNote
    };
  }
}
