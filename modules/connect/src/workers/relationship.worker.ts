/**
 * Campus Connect — Relationship Worker
 * Maintains derived RelationshipStrength score based on accepted connection requests, conversations, study groups, mentorship, and projects.
 * Derived only — NEVER manually edited.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export class RelationshipWorker {
  private relationshipStrengths: Map<string, number> = new Map();

  async processRelationshipActivity(
    event: ConnectEventEnvelope<{ studentAId: string; studentBId: string; activityType: string; scoreDelta: number }>
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const { studentAId, studentBId, scoreDelta } = event.payload;
      const pairKey = [studentAId, studentBId].sort().join(':');
      const fullKey = `${event.collegeId}:${pairKey}`;

      const currentScore = this.relationshipStrengths.get(fullKey) || 0.0;
      const newScore = Math.max(0.0, Math.min(1.0, currentScore + scoreDelta));
      this.relationshipStrengths.set(fullKey, newScore);

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('RelationshipWorker', duration, true);
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('RelationshipWorker', duration, false);
      throw err;
    }
  }

  getRelationshipStrength(studentAId: string, studentBId: string, collegeId: string): number {
    const pairKey = [studentAId, studentBId].sort().join(':');
    return this.relationshipStrengths.get(`${collegeId}:${pairKey}`) || 0.0;
  }

  clear(): void {
    this.relationshipStrengths.clear();
  }
}
