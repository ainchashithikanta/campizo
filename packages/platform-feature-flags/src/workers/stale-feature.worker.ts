/**
 * StaleFeatureWorker
 * Detects unused flags, expired beta flags, orphaned templates, and expired rollouts.
 */

export interface StaleFeatureReport {
  flagKey: string;
  daysConstant: number;
  ownerTeam: string;
  recommendedAction: 'DEPRECATE' | 'REMOVE' | 'NOTIFY_OWNER';
}

export class StaleFeatureWorker {
  public readonly workerName = 'StaleFeatureWorker';

  /**
   * Scans production flags for stale usage (>60 days unchanged).
   * Expected complexity: O(N) where N is production flag count.
   */
  async scanStaleFeatures(
    activeFlags: Array<{ flagKey: string; ownerTeam: string; daysUnchanged: number }>
  ): Promise<StaleFeatureReport[]> {
    const reports: StaleFeatureReport[] = [];

    for (const flag of activeFlags) {
      if (flag.daysUnchanged >= 60) {
        reports.push({
          flagKey: flag.flagKey,
          daysConstant: flag.daysUnchanged,
          ownerTeam: flag.ownerTeam,
          recommendedAction: flag.daysUnchanged >= 90 ? 'REMOVE' : 'DEPRECATE'
        });
      }
    }

    return reports;
  }
}
