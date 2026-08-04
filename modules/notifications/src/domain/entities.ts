/**
 * Unified Notification Engine — Domain Entities & Types (MS-40 Production)
 */

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
export type NotificationCategory =
  'MARKETPLACE' | 'PLACEMENT' | 'ACADEMIC' | 'SECURITY' | 'CAMPUS_CONNECT' | 'RATE_MY_PROFESSOR' | 'SYSTEM' | 'GENERAL';

export interface NotificationEntity {
  id: string;
  collegeId: string;
  recipientId: string;
  actorId: string;
  eventType: string;
  category: NotificationCategory;
  deduplicationKey?: string | null | undefined;
  aggregationCount: number;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  link?: string | null | undefined;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Date | null | undefined;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null | undefined;
}

export interface NotificationPreferenceEntity {
  id: string;
  collegeId: string;
  userId: string;
  channel: NotificationChannel;
  enabledEventTypes: string[];
  isMuted: boolean;
  updatedAt: Date;
}

export interface NotificationUserRuleEntity {
  id: string;
  collegeId: string;
  userId: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "07:00"
  timezone: string;
  digestFrequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  archiveAfterDays: number;
  mutedCategories: NotificationCategory[];
  mutedEventTypes: string[];
  updatedAt: Date;
}

export interface NotificationDigestJobEntity {
  id: string;
  collegeId: string;
  recipientId: string;
  digestType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  itemsCount: number;
  status: 'PENDING' | 'GENERATED' | 'DELIVERED';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export interface NotificationQueueItemEntity {
  id: string;
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  attempts: number;
  nextAttemptAt: Date;
  status: 'QUEUED' | 'PROCESSING' | 'DELIVERED' | 'FAILED';
  createdAt: Date;
}

export interface NotificationFilterParams {
  collegeId: string;
  recipientId: string;
  category?: NotificationCategory | undefined;
  isRead?: boolean | undefined;
  isArchived?: boolean | undefined;
  eventType?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PublishNotificationPayload {
  collegeId: string;
  recipientId: string;
  actorId: string;
  actorName?: string | undefined;
  eventType: string;
  category?: NotificationCategory | undefined;
  deduplicationKey?: string | undefined;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | undefined;
  link?: string | undefined;
  priority?: NotificationPriority | undefined;
}
