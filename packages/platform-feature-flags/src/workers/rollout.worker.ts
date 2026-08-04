/**
 * RolloutWorker
 * Manages scheduled percentage bucket progressions for canary releases.
 */

import { EnvelopeDomainEvent } from './event-router.js';

export class RolloutWorker {
  public readonly workerName = 'RolloutWorker';

  /**
   * Processes rollout progression steps.
   * Expected complexity: O(1).
   */
  async processRolloutStep(envelope: EnvelopeDomainEvent): Promise<{ nextPercentage: number; completed: boolean }> {
    const { event } = envelope;
    const currentPercentage = (event as any).initialPercentage || 0;
    const nextPercentage = Math.min(100, currentPercentage + 25);

    return {
      nextPercentage,
      completed: nextPercentage === 100
    };
  }
}
