/**
 * Campus Connect — Moderation Worker
 * Background moderation processing pipeline consuming ReportCreated / ModerationCaseOpened events
 * and emitting ModerationQueued / ModerationCompleted lifecycle events.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export class ModerationWorker {
  constructor(private readonly useCases: ConnectUseCases) {}

  async processReportCreated(event: ConnectEventEnvelope<{ caseId: string; reportedUserId: string; reporterUserId: string; reason: string }>): Promise<void> {
    const startTime = Date.now();
    try {
      const { caseId, reportedUserId, reporterUserId, reason } = event.payload;

      // 1. Record report via use case
      await this.useCases.reportUser({
        caseId,
        collegeId: event.collegeId,
        reportedUserId,
        reporterUserId,
        reason
      });

      // 2. Automatically record initial queue placement
      await this.useCases.recordModerationDecision({
        caseId,
        collegeId: event.collegeId,
        actionTaken: 'QUEUED_FOR_REVIEW',
        moderatorId: 'system_moderation_worker'
      });

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('ModerationWorker', duration, true);
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('ModerationWorker', duration, false);
      throw err;
    }
  }
}
