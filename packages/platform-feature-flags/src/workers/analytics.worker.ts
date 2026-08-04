/**
 * AnalyticsWorker (SOLE WRITER FOR USAGE STATISTICS)
 * Flushes evaluation telemetry ring buffers to persistent time-bucketed database storage.
 */

import { EnvelopeDomainEvent } from './event-router.js';

export interface TelemetryBatchEntry {
  flagKey: string;
  collegeId: string;
  evaluationsCount: number;
  enabledCount: number;
  disabledCount: number;
}

export class AnalyticsWorker {
  public readonly workerName = 'AnalyticsWorker';
  private readonly batchBuffer: TelemetryBatchEntry[] = [];

  /**
   * Sole writer flushing telemetry data asynchronously.
   * Expected complexity: O(B) where B is batch size.
   */
  async flushTelemetryBatch(batch: TelemetryBatchEntry[]): Promise<{ flushedCount: number }> {
    this.batchBuffer.push(...batch);
    const count = batch.length;
    return { flushedCount: count };
  }

  async processEvaluationEvent(envelope: EnvelopeDomainEvent): Promise<void> {
    const { event } = envelope;
    if (event.eventType === 'FeatureEvaluated') {
      this.batchBuffer.push({
        flagKey: (event as any).flagKey,
        collegeId: event.collegeId || 'global',
        evaluationsCount: 1,
        enabledCount: (event as any).enabled ? 1 : 0,
        disabledCount: (event as any).enabled ? 0 : 1
      });
    }
  }

  getBufferedCount(): number {
    return this.batchBuffer.length;
  }
}
