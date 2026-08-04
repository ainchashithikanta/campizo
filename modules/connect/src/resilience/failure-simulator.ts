/**
 * Campus Connect — Failure Simulator
 * Deterministic simulation of infrastructure outages, slow processing, queue crashes, and duplicate events for testing.
 */

export class FailureSimulator {
  private activeSimulations: Set<string> = new Set();
  private artificialDelays: Map<string, number> = new Map();

  enableSimulation(failureKey: string, delayMs: number = 0): void {
    this.activeSimulations.add(failureKey);
    if (delayMs > 0) {
      this.artificialDelays.set(failureKey, delayMs);
    }
  }

  disableSimulation(failureKey: string): void {
    this.activeSimulations.delete(failureKey);
    this.artificialDelays.delete(failureKey);
  }

  isSimulated(failureKey: string): boolean {
    return this.activeSimulations.has(failureKey);
  }

  async checkAndSimulate(failureKey: string): Promise<void> {
    if (this.isSimulated(failureKey)) {
      const delay = this.artificialDelays.get(failureKey) || 0;
      if (delay > 0) {
        await new Promise((res) => setTimeout(res, delay));
      }
      throw new Error(`Simulated Failure: [${failureKey}] is down or crashed.`);
    }
  }

  clearAll(): void {
    this.activeSimulations.clear();
    this.artificialDelays.clear();
  }
}
