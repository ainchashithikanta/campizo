/**
 * NotificationWorker
 * Prepares alert and approval notification payloads ONLY. Never sends emails/SMS directly.
 */

import { EnvelopeDomainEvent } from './event-router.js';

export interface NotificationPayload {
  recipientUserId?: string | undefined;
  notificationType: string;
  title: string;
  message: string;
  preparedAt: string;
}

export class NotificationWorker {
  public readonly workerName = 'NotificationWorker';
  private readonly preparedPayloads: NotificationPayload[] = [];

  /**
   * Prepares notification payload without external side-effects.
   * Expected complexity: O(1).
   */
  async prepareNotification(envelope: EnvelopeDomainEvent): Promise<NotificationPayload> {
    const { event } = envelope;
    const payload: NotificationPayload = {
      recipientUserId: (event as any).operatorUserId || (event as any).requesterUserId,
      notificationType: event.eventType,
      title: `Platform Event: ${event.eventType}`,
      message: `Event ${event.eventType} occurred for flag ${(event as any).flagKey || 'system'}`,
      preparedAt: new Date().toISOString()
    };

    this.preparedPayloads.push(payload);
    return payload;
  }

  getPreparedPayloads(): NotificationPayload[] {
    return [...this.preparedPayloads];
  }
}
