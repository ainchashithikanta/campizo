/**
 * Unified Notification Engine — Generic Platform Event Publisher Interface
 * Allows any module in College Hub (Marketplace, Placement, Connect, Confessions, etc.)
 * to publish domain events without hardcoded coupling.
 */

import { PublishNotificationPayload } from './entities.js';

export interface IPlatformEventPublisher {
  publish(event: PublishNotificationPayload): Promise<void>;
  publishBatch(events: PublishNotificationPayload[]): Promise<void>;
}
