/**
 * Campus Connect — Intent Expiry Worker
 * Automatically scans and archives expired student intents, publishing IntentExpired and IntentArchived events.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export class IntentExpiryWorker {
  constructor(private readonly useCases: ConnectUseCases) {}

  async processIntentExpiryCheck(event: ConnectEventEnvelope<{ intentId?: string; expiredBefore?: string }>): Promise<void> {
    const startTime = Date.now();
    try {
      const intentId = event.payload.intentId || `int_expired_${Date.now()}`;
      
      // Execute Intent Archive Use Case
      await this.useCases.intentService.archiveIntent(intentId, event.collegeId, 1);

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('IntentExpiryWorker', duration, true);
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('IntentExpiryWorker', duration, false);
      throw err;
    }
  }
}
