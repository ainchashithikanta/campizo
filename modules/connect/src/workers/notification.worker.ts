/**
 * Campus Connect — Notification Worker
 * Prepares notification payloads ONLY. Never sends email, SMS, or push directly.
 * Only enqueues standardized notification payloads to external notification queues. Target <30ms.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { WorkerMetrics } from '../metrics/worker-metrics.js';

export interface PreparedNotificationPayload {
  notificationId: string;
  recipientId: string;
  collegeId: string;
  title: string;
  body: string;
  category: 'CONNECTION' | 'MESSAGE' | 'INTENT' | 'SYSTEM';
  preparedAt: string;
}

export class NotificationWorker {
  private enqueuedPayloads: PreparedNotificationPayload[] = [];

  async processNotificationEvent(
    event: ConnectEventEnvelope<{ recipientId: string; title: string; body: string; category?: string }>
  ): Promise<PreparedNotificationPayload> {
    const startTime = Date.now();
    try {
      const payload: PreparedNotificationPayload = {
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: event.payload.recipientId,
        collegeId: event.collegeId,
        title: event.payload.title,
        body: event.payload.body,
        category: (event.payload.category as any) || 'SYSTEM',
        preparedAt: new Date().toISOString()
      };

      // Enqueue payload ONLY (never send push/SMS/email directly)
      this.enqueuedPayloads.push(payload);

      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('NotificationWorker', duration, true);
      return payload;
    } catch (err) {
      const duration = Date.now() - startTime;
      WorkerMetrics.getInstance().recordJobExecution('NotificationWorker', duration, false);
      throw err;
    }
  }

  getEnqueuedPayloads(): PreparedNotificationPayload[] {
    return [...this.enqueuedPayloads];
  }

  clear(): void {
    this.enqueuedPayloads = [];
  }
}
