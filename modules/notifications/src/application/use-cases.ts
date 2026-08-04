/**
 * Unified Notification Engine — Application Layer CQRS Use Cases (MS-40 Production)
 */

import { INotificationRepository } from '../domain/repository.interface.js';
import { IPlatformEventPublisher } from '../domain/publisher.interface.js';
import {
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationUserRuleEntity,
  NotificationDigestJobEntity,
  NotificationQueueItemEntity,
  NotificationFilterParams,
  PublishNotificationPayload,
  NotificationCategory
} from '../domain/entities.js';

export class NotificationUseCases {
  constructor(
    private readonly repo: INotificationRepository,
    private readonly publisher?: IPlatformEventPublisher
  ) {}

  async publishNotification(payload: PublishNotificationPayload): Promise<NotificationEntity> {
    if (this.publisher) {
      await this.publisher.publish(payload);
      const list = await this.repo.findNotifications({
        collegeId: payload.collegeId,
        recipientId: payload.recipientId,
        limit: 1
      });
      if (list.items.length > 0) return list.items[0]!;
    }
    return this.repo.createNotification(payload);
  }

  async listNotifications(
    params: NotificationFilterParams
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number; hasMore: boolean }> {
    return this.repo.findNotifications(params);
  }

  async getUnreadCount(recipientId: string, collegeId: string): Promise<number> {
    return this.repo.getUnreadCount(recipientId, collegeId);
  }

  async markAsRead(id: string, recipientId: string, collegeId: string): Promise<NotificationEntity | null> {
    return this.repo.markAsRead(id, recipientId, collegeId);
  }

  async markAllAsRead(recipientId: string, collegeId: string): Promise<number> {
    return this.repo.markAllAsRead(recipientId, collegeId);
  }

  async deleteNotification(id: string, recipientId: string, collegeId: string): Promise<boolean> {
    return this.repo.softDeleteNotification(id, recipientId, collegeId);
  }

  async getPreferences(userId: string, collegeId: string): Promise<NotificationPreferenceEntity[]> {
    return this.repo.getPreferences(userId, collegeId);
  }

  async updatePreferences(pref: {
    id?: string | undefined;
    userId: string;
    collegeId: string;
    channel: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
    enabledEventTypes?: string[] | undefined;
    isMuted?: boolean | undefined;
  }): Promise<NotificationPreferenceEntity> {
    return this.repo.upsertPreferences(pref);
  }

  async getUserRules(userId: string, collegeId: string): Promise<NotificationUserRuleEntity | null> {
    return this.repo.getUserRules(userId, collegeId);
  }

  async updateUserRules(rules: {
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
  }): Promise<NotificationUserRuleEntity> {
    return this.repo.upsertUserRules(rules);
  }

  async generateDigest(
    collegeId: string,
    recipientId: string,
    digestType: 'DAILY' | 'WEEKLY'
  ): Promise<NotificationDigestJobEntity> {
    return this.repo.createDigestJob(collegeId, recipientId, digestType);
  }

  async getDigestJobs(recipientId: string, collegeId: string): Promise<NotificationDigestJobEntity[]> {
    return this.repo.getDigestJobs(recipientId, collegeId);
  }

  async getDeliveryQueue(recipientId: string): Promise<NotificationQueueItemEntity[]> {
    return this.repo.getQueueItems(recipientId);
  }

  getCategories(): Array<{ id: NotificationCategory; label: string; description: string }> {
    return [
      { id: 'MARKETPLACE', label: 'Marketplace', description: 'Item listings, purchases, and buyer offers' },
      {
        id: 'PLACEMENT',
        label: 'Placements & Q&A',
        description: 'Interview experiences, question bank, and community answers'
      },
      { id: 'ACADEMIC', label: 'Academic Resources', description: 'Lecture notes, PYQs, and study material uploads' },
      { id: 'CAMPUS_CONNECT', label: 'Campus Connect', description: 'Student matches and connection requests' },
      { id: 'RATE_MY_PROFESSOR', label: 'Rate My Professor', description: 'Professor reviews and reply notifications' },
      { id: 'SECURITY', label: 'Security & Auth', description: 'Security alerts and password changes' },
      { id: 'SYSTEM', label: 'System Announcements', description: 'Platform updates and scheduled maintenance' },
      { id: 'GENERAL', label: 'General', description: 'Miscellaneous community updates' }
    ];
  }
}
