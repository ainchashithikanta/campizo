/**
 * Campus Connect — Trust Score Worker
 * Recalculates student private trust scores following reports, mentorship completion, project completion, or connection quality.
 * TRUST SCORE MUST NEVER BE MADE PUBLIC OR EXPOSED IN API RESPONSES.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export class TrustScoreWorker {
  // Private internal score store (NEVER EXPOSED TO PUBLIC API)
  private privateTrustScores: Map<string, number> = new Map();

  async processTrustScoreRecalculation(event: ConnectEventEnvelope<{ studentProfileId: string; factor: string; delta: number }>): Promise<void> {
    const startTime = Date.now();
    try {
      const { studentProfileId, delta } = event.payload;
      const key = `${event.collegeId}:${studentProfileId}`;
      const currentScore = this.privateTrustScores.get(key) || 100.0;

      const updatedScore = Math.max(0.0, Math.min(100.0, currentScore + delta));
      this.privateTrustScores.set(key, updatedScore);

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('TrustScoreWorker', duration, true);
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('TrustScoreWorker', duration, false);
      throw err;
    }
  }

  // Internal audit accessor ONLY
  getInternalTrustScore(studentProfileId: string, collegeId: string): number | undefined {
    return this.privateTrustScores.get(`${collegeId}:${studentProfileId}`);
  }

  clear(): void {
    this.privateTrustScores.clear();
  }
}
