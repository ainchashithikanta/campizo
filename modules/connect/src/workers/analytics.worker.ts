/**
 * Campus Connect — Analytics Worker
 * THE ONLY COMPONENT AUTHORIZED TO WRITE ANALYTICS AGGREGATIONS.
 * Aggregates metrics for discovery, recommendations, profile views, connection requests, study groups, and messaging.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export interface AnalyticsAggregate {
  collegeId: string;
  category: 'DISCOVERY' | 'RECOMMENDATION' | 'PROFILE_VIEW' | 'CONNECTION_REQUEST' | 'STUDY_GROUP' | 'MESSAGING';
  count: number;
  lastUpdated: string;
}

export class AnalyticsWorker {
  private analyticsStore: Map<string, number> = new Map();

  async processAnalyticsEvent(
    event: ConnectEventEnvelope<{
      category: 'DISCOVERY' | 'RECOMMENDATION' | 'PROFILE_VIEW' | 'CONNECTION_REQUEST' | 'STUDY_GROUP' | 'MESSAGING';
      incrementBy?: number;
    }>
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const { category, incrementBy = 1 } = event.payload;
      const key = `${event.collegeId}:${category}`;

      const current = this.analyticsStore.get(key) || 0;
      this.analyticsStore.set(key, current + incrementBy);

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('AnalyticsWorker', duration, true);
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('AnalyticsWorker', duration, false);
      throw err;
    }
  }

  getAggregate(collegeId: string, category: string): number {
    return this.analyticsStore.get(`${collegeId}:${category}`) || 0;
  }

  clear(): void {
    this.analyticsStore.clear();
  }
}
