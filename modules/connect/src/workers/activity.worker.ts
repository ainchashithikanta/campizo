/**
 * Campus Connect — Activity Worker
 * Writes immutable, append-only activity feed log entries.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export interface ActivityFeedEntry {
  activityId: string;
  collegeId: string;
  actorId: string;
  actionType: string;
  metadata: Record<string, any>;
  recordedAt: string;
}

export class ActivityWorker {
  private activityStore: ActivityFeedEntry[] = [];

  async processActivityEvent(event: ConnectEventEnvelope<{ actorId: string; actionType: string; metadata?: Record<string, any> }>): Promise<ActivityFeedEntry> {
    const startTime = Date.now();
    try {
      const entry: ActivityFeedEntry = {
        activityId: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        collegeId: event.collegeId,
        actorId: event.payload.actorId,
        actionType: event.payload.actionType,
        metadata: event.payload.metadata || {},
        recordedAt: new Date().toISOString()
      };

      // Immutable append-only write
      this.activityStore.push(entry);

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('ActivityWorker', duration, true);
      return entry;
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('ActivityWorker', duration, false);
      throw err;
    }
  }

  getActivityFeed(collegeId: string): ActivityFeedEntry[] {
    return this.activityStore.filter((a) => a.collegeId === collegeId);
  }

  clear(): void {
    this.activityStore = [];
  }
}
