/**
 * RollbackManager
 * Executes emergency automated rollbacks of failed rollouts to last known-good snapshot.
 */

import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { EnvironmentType } from '../domain/value-objects.js';

export class RollbackManager {
  constructor(private readonly useCases: FeatureUseCases) {}

  /**
   * Automates emergency rollback to last known-good snapshot.
   * Expected complexity: O(1).
   */
  async rollbackFailedRollout(
    flagKey: string,
    environment: EnvironmentType,
    lastKnownGoodSnapshotId: string,
    operatorUserId: string
  ): Promise<{ rolledBack: boolean; restoredSnapshotId: string }> {
    // 1. Activate emergency Kill Switch
    await this.useCases.activateKillSwitch(
      flagKey,
      'Automated rollback triggered due to rollout failure',
      operatorUserId
    );

    // 2. Restore last known-good snapshot
    const restored = await this.useCases.restoreSnapshot(lastKnownGoodSnapshotId, environment, operatorUserId);

    return {
      rolledBack: true,
      restoredSnapshotId: restored.snapshotId
    };
  }
}
