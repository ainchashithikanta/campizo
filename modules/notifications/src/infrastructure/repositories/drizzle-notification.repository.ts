/**
 * Unified Notification Engine — Drizzle ORM Repository Implementation (MS-40 Production)
 */

import { eq, and, isNull, sql } from 'drizzle-orm';
import { INotificationRepository } from '../../domain/repository.interface.js';
import {
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationUserRuleEntity,
  NotificationDigestJobEntity,
  NotificationQueueItemEntity,
  NotificationFilterParams,
  PublishNotificationPayload,
  NotificationCategory
} from '../../domain/entities.js';

import {
  notifications,
  notificationPreferences,
  notificationUserRules,
  notificationDigestJobs,
  notificationDeliveryQueue
} from '../schema/notifications.schema.js';

export class DrizzleNotificationRepository implements INotificationRepository {
  constructor(private readonly db: any) {}

  private deriveCategory(eventType: string): NotificationCategory {
    if (eventType.includes('MARKETPLACE')) return 'MARKETPLACE';
    if (
      eventType.includes('PLACEMENT') ||
      eventType.includes('DISCUSSION') ||
      eventType.includes('QUESTION') ||
      eventType.includes('INTERVIEW')
    )
      return 'PLACEMENT';
    if (eventType.includes('RESOURCE') || eventType.includes('ACADEMIC')) return 'ACADEMIC';
    if (eventType.includes('PROFESSOR') || eventType.includes('REVIEW')) return 'RATE_MY_PROFESSOR';
    if (eventType.includes('CONNECT') || eventType.includes('MATCH') || eventType.includes('FRIEND'))
      return 'CAMPUS_CONNECT';
    if (eventType.includes('SECURITY') || eventType.includes('ACCOUNT')) return 'SECURITY';
    if (eventType.includes('SYSTEM')) return 'SYSTEM';
    return 'GENERAL';
  }

  async createNotification(payload: PublishNotificationPayload): Promise<NotificationEntity> {
    const category = payload.category || this.deriveCategory(payload.eventType);

    if (payload.deduplicationKey) {
      const existingRows = await this.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.collegeId, payload.collegeId),
            eq(notifications.recipientId, payload.recipientId),
            eq(notifications.deduplicationKey, payload.deduplicationKey),
            eq(notifications.isRead, false),
            isNull(notifications.deletedAt)
          )
        )
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        const existing = existingRows[0];
        const newCount = (existing.aggregationCount || 1) + 1;
        const actorName = payload.actorName || 'A user';
        const newMsg = `${actorName} and ${newCount - 1} others liked your answer.`;

        const updatedRows = await this.db
          .update(notifications)
          .set({ aggregationCount: newCount, message: newMsg, updatedAt: new Date() })
          .where(eq(notifications.id, existing.id))
          .returning();

        return updatedRows[0] as NotificationEntity;
      }
    }

    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rows = await this.db
      .insert(notifications)
      .values({
        id,
        collegeId: payload.collegeId,
        recipientId: payload.recipientId,
        actorId: payload.actorId,
        eventType: payload.eventType,
        category,
        deduplicationKey: payload.deduplicationKey || null,
        aggregationCount: 1,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata || {},
        link: payload.link || null,
        priority: payload.priority || 'NORMAL',
        isRead: false
      })
      .returning();
    return rows[0] as NotificationEntity;
  }

  async findNotificationById(id: string, collegeId: string): Promise<NotificationEntity | null> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.collegeId, collegeId), isNull(notifications.deletedAt)))
      .limit(1);
    if (!rows || rows.length === 0) return null;
    return rows[0] as NotificationEntity;
  }

  async findNotifications(
    params: NotificationFilterParams
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number; hasMore: boolean }> {
    const conditions = [
      eq(notifications.collegeId, params.collegeId),
      eq(notifications.recipientId, params.recipientId),
      isNull(notifications.deletedAt)
    ];

    if (params.category) {
      conditions.push(eq(notifications.category, params.category));
    }
    if (params.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, params.isRead));
    }
    if (params.isArchived !== undefined) {
      conditions.push(eq(notifications.isArchived, params.isArchived));
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    const unreadCount = await this.getUnreadCount(params.recipientId, params.collegeId);

    return {
      items: rows as NotificationEntity[],
      total: rows.length,
      unreadCount,
      hasMore: rows.length === limit
    };
  }

  async getUnreadCount(recipientId: string, collegeId: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.collegeId, collegeId),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt)
        )
      );
    return Number(rows[0]?.count || 0);
  }

  async markAsRead(id: string, recipientId: string, collegeId: string): Promise<NotificationEntity | null> {
    const rows = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.collegeId, collegeId),
          eq(notifications.recipientId, recipientId)
        )
      )
      .returning();
    if (!rows || rows.length === 0) return null;
    return rows[0] as NotificationEntity;
  }

  async markAllAsRead(recipientId: string, collegeId: string): Promise<number> {
    const rows = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notifications.collegeId, collegeId),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false)
        )
      )
      .returning();
    return rows.length;
  }

  async softDeleteNotification(id: string, recipientId: string, collegeId: string): Promise<boolean> {
    const rows = await this.db
      .update(notifications)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.collegeId, collegeId),
          eq(notifications.recipientId, recipientId)
        )
      )
      .returning();
    return rows.length > 0;
  }

  async getPreferences(userId: string, collegeId: string): Promise<NotificationPreferenceEntity[]> {
    const rows = await this.db
      .select()
      .from(notificationPreferences)
      .where(and(eq(notificationPreferences.collegeId, collegeId), eq(notificationPreferences.userId, userId)));
    return rows as NotificationPreferenceEntity[];
  }

  async upsertPreferences(pref: {
    id?: string | undefined;
    userId: string;
    collegeId: string;
    channel: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
    enabledEventTypes?: string[] | undefined;
    isMuted?: boolean | undefined;
  }): Promise<NotificationPreferenceEntity> {
    const id = pref.id || `pref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rows = await this.db
      .insert(notificationPreferences)
      .values({
        id,
        collegeId: pref.collegeId,
        userId: pref.userId,
        channel: pref.channel,
        enabledEventTypes: pref.enabledEventTypes || [],
        isMuted: pref.isMuted || false
      })
      .onConflictDoUpdate({
        target: [notificationPreferences.collegeId, notificationPreferences.userId, notificationPreferences.channel],
        set: {
          enabledEventTypes: pref.enabledEventTypes || [],
          isMuted: pref.isMuted || false,
          updatedAt: new Date()
        }
      })
      .returning();
    return rows[0] as NotificationPreferenceEntity;
  }

  async getUserRules(userId: string, collegeId: string): Promise<NotificationUserRuleEntity | null> {
    const rows = await this.db
      .select()
      .from(notificationUserRules)
      .where(and(eq(notificationUserRules.collegeId, collegeId), eq(notificationUserRules.userId, userId)))
      .limit(1);
    if (!rows || rows.length === 0) return null;
    return rows[0] as NotificationUserRuleEntity;
  }

  async upsertUserRules(
    rules: Partial<NotificationUserRuleEntity> & { userId: string; collegeId: string }
  ): Promise<NotificationUserRuleEntity> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rows = await this.db
      .insert(notificationUserRules)
      .values({
        id,
        collegeId: rules.collegeId,
        userId: rules.userId,
        quietHoursEnabled: rules.quietHoursEnabled ?? false,
        quietHoursStart: rules.quietHoursStart || '22:00',
        quietHoursEnd: rules.quietHoursEnd || '07:00',
        timezone: rules.timezone || 'UTC',
        digestFrequency: rules.digestFrequency || 'INSTANT',
        archiveAfterDays: rules.archiveAfterDays ?? 30,
        mutedCategories: rules.mutedCategories || [],
        mutedEventTypes: rules.mutedEventTypes || []
      })
      .onConflictDoUpdate({
        target: [notificationUserRules.userId],
        set: {
          quietHoursEnabled: rules.quietHoursEnabled,
          quietHoursStart: rules.quietHoursStart,
          quietHoursEnd: rules.quietHoursEnd,
          timezone: rules.timezone,
          digestFrequency: rules.digestFrequency,
          archiveAfterDays: rules.archiveAfterDays,
          mutedCategories: rules.mutedCategories,
          mutedEventTypes: rules.mutedEventTypes,
          updatedAt: new Date()
        }
      })
      .returning();
    return rows[0] as NotificationUserRuleEntity;
  }

  async createDigestJob(
    collegeId: string,
    recipientId: string,
    digestType: 'DAILY' | 'WEEKLY'
  ): Promise<NotificationDigestJobEntity> {
    const unread = await this.getUnreadCount(recipientId, collegeId);
    const id = `dig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rows = await this.db
      .insert(notificationDigestJobs)
      .values({
        id,
        collegeId,
        recipientId,
        digestType,
        itemsCount: unread,
        status: 'GENERATED',
        periodStart: new Date(Date.now() - 86400000),
        periodEnd: new Date()
      })
      .returning();
    return rows[0] as NotificationDigestJobEntity;
  }

  async getDigestJobs(recipientId: string, collegeId: string): Promise<NotificationDigestJobEntity[]> {
    const rows = await this.db
      .select()
      .from(notificationDigestJobs)
      .where(and(eq(notificationDigestJobs.collegeId, collegeId), eq(notificationDigestJobs.recipientId, recipientId)));
    return rows as NotificationDigestJobEntity[];
  }

  async enqueueDelivery(
    notificationId: string,
    recipientId: string,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  ): Promise<NotificationQueueItemEntity> {
    const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rows = await this.db
      .insert(notificationDeliveryQueue)
      .values({
        id,
        notificationId,
        recipientId,
        channel: 'IN_APP',
        priority,
        attempts: 0,
        nextAttemptAt: new Date(),
        status: 'QUEUED'
      })
      .returning();
    return rows[0] as NotificationQueueItemEntity;
  }

  async getQueueItems(recipientId: string): Promise<NotificationQueueItemEntity[]> {
    const rows = await this.db
      .select()
      .from(notificationDeliveryQueue)
      .where(eq(notificationDeliveryQueue.recipientId, recipientId));
    return rows as NotificationQueueItemEntity[];
  }
}
