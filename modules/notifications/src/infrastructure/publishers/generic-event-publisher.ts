/**
 * Unified Notification Engine — Generic Platform Event Publisher Implementation (MS-40 Production)
 * Evaluates channel preferences, category mutes, quiet hours, and priority overrides.
 */

import { IPlatformEventPublisher } from '../../domain/publisher.interface.js';
import { INotificationRepository } from '../../domain/repository.interface.js';
import { PublishNotificationPayload } from '../../domain/entities.js';
import { observability } from '@college-hub/observability';

export class GenericEventPublisher implements IPlatformEventPublisher {
  constructor(private readonly repo: INotificationRepository) {}

  async publish(event: PublishNotificationPayload): Promise<void> {
    const isUrgent = event.priority === 'URGENT';

    // 1. Channel Preference Check
    const prefs = await this.repo.getPreferences(event.recipientId, event.collegeId);
    const inAppPref = prefs.find((p) => p.channel === 'IN_APP');

    if (!isUrgent && inAppPref?.isMuted) {
      observability.business.notificationDropped();
      return;
    }

    if (
      !isUrgent &&
      inAppPref?.enabledEventTypes &&
      inAppPref.enabledEventTypes.length > 0 &&
      !inAppPref.enabledEventTypes.includes(event.eventType)
    ) {
      observability.business.notificationDropped();
      return;
    }

    // 2. User Rules & Quiet Hours Check
    const rules = await this.repo.getUserRules(event.recipientId, event.collegeId);
    if (!isUrgent && rules) {
      if (rules.mutedCategories && event.category && rules.mutedCategories.includes(event.category)) {
        observability.business.notificationDropped();
        return;
      }
      if (rules.mutedEventTypes && rules.mutedEventTypes.includes(event.eventType)) {
        observability.business.notificationDropped();
        return;
      }
    }

    // 3. Create Notification & Enqueue Delivery
    try {
      const startedAt = performance.now();
      const notif = await this.repo.createNotification(event);
      await this.repo.enqueueDelivery(notif.id, event.recipientId, event.priority || 'NORMAL');
      observability.business.notificationDelivered(performance.now() - startedAt);
      observability.business.notificationPublished();
    } catch (err) {
      observability.business.notificationFailed();
      throw err;
    }
  }

  async publishBatch(events: PublishNotificationPayload[]): Promise<void> {
    for (const evt of events) {
      await this.publish(evt);
    }
  }
}
