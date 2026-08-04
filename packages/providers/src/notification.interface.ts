import type { BaseProvider } from './base.interface.js';

export interface NotificationPayload {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationProvider extends BaseProvider {
  readonly type: 'NOTIFICATION';
  sendNotification(payload: NotificationPayload): Promise<{ success: boolean; messageId: string }>;
  sendBatchNotifications(payloads: NotificationPayload[]): Promise<{ successCount: number; failureCount: number }>;
}
