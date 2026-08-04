/**
 * Unified Notification Engine — In-Memory Repository Implementation (MS-40 Production)
 */

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

export class InMemoryNotificationRepository implements INotificationRepository {
  public notifications: Map<string, NotificationEntity> = new Map();
  public preferences: Map<string, NotificationPreferenceEntity> = new Map();
  public userRules: Map<string, NotificationUserRuleEntity> = new Map();
  public digestJobs: Map<string, NotificationDigestJobEntity> = new Map();
  public queueItems: Map<string, NotificationQueueItemEntity> = new Map();

  constructor() {
    const notif1: NotificationEntity = {
      id: 'notif_welcome_001',
      collegeId: 'college_stanford_001',
      recipientId: 'usr_me',
      actorId: 'system_bot',
      eventType: 'NEW_RESOURCE_UPLOAD',
      category: 'ACADEMIC',
      aggregationCount: 1,
      title: 'New Study Resource Uploaded',
      message: 'Professor Smith uploaded Advanced Algorithms Lecture Notes 2026.',
      metadata: { resourceId: 'res_101', subject: 'Computer Science' },
      link: '/resources/res_101',
      priority: 'NORMAL',
      isRead: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const notif2: NotificationEntity = {
      id: 'notif_sold_002',
      collegeId: 'college_stanford_001',
      recipientId: 'usr_me',
      actorId: 'usr_buyer_99',
      eventType: 'MARKETPLACE_ITEM_SOLD',
      category: 'MARKETPLACE',
      aggregationCount: 1,
      title: 'Marketplace Item Sold!',
      message: 'Your Calculus Textbook was purchased for $45.00.',
      metadata: { itemId: 'item_77' },
      link: '/marketplace/item_77',
      priority: 'HIGH',
      isRead: true,
      readAt: new Date(),
      isArchived: false,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date()
    };

    this.notifications.set(`${notif1.collegeId}:${notif1.id}`, notif1);
    this.notifications.set(`${notif2.collegeId}:${notif2.id}`, notif2);

    const defaultRule: NotificationUserRuleEntity = {
      id: 'rule_usr_me',
      collegeId: 'college_stanford_001',
      userId: 'usr_me',
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'UTC',
      digestFrequency: 'INSTANT',
      archiveAfterDays: 30,
      mutedCategories: [],
      mutedEventTypes: [],
      updatedAt: new Date()
    };
    this.userRules.set(`college_stanford_001:usr_me`, defaultRule);
  }

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
      for (const existing of this.notifications.values()) {
        if (
          existing.collegeId === payload.collegeId &&
          existing.recipientId === payload.recipientId &&
          existing.deduplicationKey === payload.deduplicationKey &&
          !existing.isRead &&
          !existing.deletedAt
        ) {
          existing.aggregationCount += 1;
          const actorName = payload.actorName || 'A user';
          existing.message = `${actorName} and ${existing.aggregationCount - 1} others liked your answer.`;
          existing.updatedAt = new Date();
          this.notifications.set(`${existing.collegeId}:${existing.id}`, existing);
          return existing;
        }
      }
    }

    const entity: NotificationEntity = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
      isRead: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.notifications.set(`${entity.collegeId}:${entity.id}`, entity);
    return entity;
  }

  async findNotificationById(id: string, collegeId: string): Promise<NotificationEntity | null> {
    const notif = this.notifications.get(`${collegeId}:${id}`);
    if (!notif || notif.deletedAt) return null;
    return notif;
  }

  async findNotifications(
    params: NotificationFilterParams
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number; hasMore: boolean }> {
    let list = Array.from(this.notifications.values()).filter(
      (n) => n.collegeId === params.collegeId && n.recipientId === params.recipientId && !n.deletedAt
    );

    if (params.category) {
      list = list.filter((n) => n.category === params.category);
    }
    if (params.isRead !== undefined) {
      list = list.filter((n) => n.isRead === params.isRead);
    }
    if (params.isArchived !== undefined) {
      list = list.filter((n) => n.isArchived === params.isArchived);
    }
    if (params.eventType) {
      list = list.filter((n) => n.eventType === params.eventType);
    }

    list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const unreadCount = Array.from(this.notifications.values()).filter(
      (n) => n.collegeId === params.collegeId && n.recipientId === params.recipientId && !n.isRead && !n.deletedAt
    ).length;

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit);

    return {
      items,
      total: list.length,
      unreadCount,
      hasMore: start + limit < list.length
    };
  }

  async getUnreadCount(recipientId: string, collegeId: string): Promise<number> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.collegeId === collegeId && n.recipientId === recipientId && !n.isRead && !n.deletedAt
    ).length;
  }

  async markAsRead(id: string, recipientId: string, collegeId: string): Promise<NotificationEntity | null> {
    const notif = await this.findNotificationById(id, collegeId);
    if (!notif || notif.recipientId !== recipientId) return null;
    notif.isRead = true;
    notif.readAt = new Date();
    this.notifications.set(`${collegeId}:${id}`, notif);
    return notif;
  }

  async markAllAsRead(recipientId: string, collegeId: string): Promise<number> {
    let count = 0;
    for (const notif of this.notifications.values()) {
      if (notif.collegeId === collegeId && notif.recipientId === recipientId && !notif.isRead && !notif.deletedAt) {
        notif.isRead = true;
        notif.readAt = new Date();
        count += 1;
      }
    }
    return count;
  }

  async softDeleteNotification(id: string, recipientId: string, collegeId: string): Promise<boolean> {
    const notif = await this.findNotificationById(id, collegeId);
    if (!notif || notif.recipientId !== recipientId) return false;
    notif.deletedAt = new Date();
    this.notifications.set(`${collegeId}:${id}`, notif);
    return true;
  }

  async getPreferences(userId: string, collegeId: string): Promise<NotificationPreferenceEntity[]> {
    return Array.from(this.preferences.values()).filter((p) => p.collegeId === collegeId && p.userId === userId);
  }

  async upsertPreferences(pref: {
    id?: string | undefined;
    userId: string;
    collegeId: string;
    channel: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
    enabledEventTypes?: string[] | undefined;
    isMuted?: boolean | undefined;
  }): Promise<NotificationPreferenceEntity> {
    const key = `${pref.collegeId}:${pref.userId}:${pref.channel}`;
    const entity: NotificationPreferenceEntity = {
      id: pref.id || `pref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId: pref.collegeId,
      userId: pref.userId,
      channel: pref.channel,
      enabledEventTypes: pref.enabledEventTypes || [],
      isMuted: pref.isMuted || false,
      updatedAt: new Date()
    };
    this.preferences.set(key, entity);
    return entity;
  }

  async getUserRules(userId: string, collegeId: string): Promise<NotificationUserRuleEntity | null> {
    return this.userRules.get(`${collegeId}:${userId}`) || null;
  }

  async upsertUserRules(
    rules: Partial<NotificationUserRuleEntity> & { userId: string; collegeId: string }
  ): Promise<NotificationUserRuleEntity> {
    const existing = (await this.getUserRules(rules.userId, rules.collegeId)) || {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId: rules.collegeId,
      userId: rules.userId,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'UTC',
      digestFrequency: 'INSTANT',
      archiveAfterDays: 30,
      mutedCategories: [],
      mutedEventTypes: [],
      updatedAt: new Date()
    };

    const entity: NotificationUserRuleEntity = {
      ...existing,
      ...rules,
      updatedAt: new Date()
    };
    this.userRules.set(`${rules.collegeId}:${rules.userId}`, entity);
    return entity;
  }

  async createDigestJob(
    collegeId: string,
    recipientId: string,
    digestType: 'DAILY' | 'WEEKLY'
  ): Promise<NotificationDigestJobEntity> {
    const unread = await this.getUnreadCount(recipientId, collegeId);
    const job: NotificationDigestJobEntity = {
      id: `dig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId,
      recipientId,
      digestType,
      itemsCount: unread,
      status: 'GENERATED',
      periodStart: new Date(Date.now() - 86400000),
      periodEnd: new Date(),
      createdAt: new Date()
    };
    this.digestJobs.set(job.id, job);
    return job;
  }

  async getDigestJobs(recipientId: string, collegeId: string): Promise<NotificationDigestJobEntity[]> {
    return Array.from(this.digestJobs.values()).filter(
      (j) => j.collegeId === collegeId && j.recipientId === recipientId
    );
  }

  async enqueueDelivery(
    notificationId: string,
    recipientId: string,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  ): Promise<NotificationQueueItemEntity> {
    const item: NotificationQueueItemEntity = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notificationId,
      recipientId,
      channel: 'IN_APP',
      priority,
      attempts: 0,
      nextAttemptAt: new Date(),
      status: 'QUEUED',
      createdAt: new Date()
    };
    this.queueItems.set(item.id, item);
    return item;
  }

  async getQueueItems(recipientId: string): Promise<NotificationQueueItemEntity[]> {
    return Array.from(this.queueItems.values()).filter((q) => q.recipientId === recipientId);
  }
}
