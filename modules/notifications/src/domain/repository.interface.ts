/**
 * Unified Notification Engine — Repository Interface (MS-40 Production)
 */

import {
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationUserRuleEntity,
  NotificationDigestJobEntity,
  NotificationQueueItemEntity,
  NotificationFilterParams,
  PublishNotificationPayload,
  NotificationCategory
} from './entities.js';

export interface INotificationRepository {
  createNotification(payload: PublishNotificationPayload): Promise<NotificationEntity>;
  findNotificationById(id: string, collegeId: string): Promise<NotificationEntity | null>;
  findNotifications(
    params: NotificationFilterParams
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number; hasMore: boolean }>;
  getUnreadCount(recipientId: string, collegeId: string): Promise<number>;
  markAsRead(id: string, recipientId: string, collegeId: string): Promise<NotificationEntity | null>;
  markAllAsRead(recipientId: string, collegeId: string): Promise<number>;
  softDeleteNotification(id: string, recipientId: string, collegeId: string): Promise<boolean>;

  getPreferences(userId: string, collegeId: string): Promise<NotificationPreferenceEntity[]>;
  upsertPreferences(pref: {
    id?: string | undefined;
    userId: string;
    collegeId: string;
    channel: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
    enabledEventTypes?: string[] | undefined;
    isMuted?: boolean | undefined;
  }): Promise<NotificationPreferenceEntity>;

  getUserRules(userId: string, collegeId: string): Promise<NotificationUserRuleEntity | null>;
  upsertUserRules(rules: {
    id?: string | undefined;
    userId: string;
    collegeId: string;
    quietHoursEnabled?: boolean | undefined;
    quietHoursStart?: string | undefined;
    quietHoursEnd?: string | undefined;
    timezone?: string | undefined;
    digestFrequency?: 'INSTANT' | 'DAILY' | 'WEEKLY' | undefined;
    archiveAfterDays?: number | undefined;
    mutedCategories?: NotificationCategory[] | undefined;
    mutedEventTypes?: string[] | undefined;
  }): Promise<NotificationUserRuleEntity>;

  createDigestJob(
    collegeId: string,
    recipientId: string,
    digestType: 'DAILY' | 'WEEKLY'
  ): Promise<NotificationDigestJobEntity>;
  getDigestJobs(recipientId: string, collegeId: string): Promise<NotificationDigestJobEntity[]>;

  enqueueDelivery(
    notificationId: string,
    recipientId: string,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  ): Promise<NotificationQueueItemEntity>;
  getQueueItems(recipientId: string): Promise<NotificationQueueItemEntity[]>;
}
