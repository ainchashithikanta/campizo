/**
 * Unified Notification Engine — Typed Frontend API SDK Client (MS-40 Production)
 */

import { apiGet, apiPost, apiPatch, apiDelete, buildQueryString } from './api-client';

export interface NotificationItem {
  id: string;
  collegeId: string;
  recipientId: string;
  actorId: string;
  eventType: string;
  category: 'MARKETPLACE' | 'PLACEMENT' | 'ACADEMIC' | 'SECURITY' | 'CAMPUS_CONNECT' | 'RATE_MY_PROFESSOR' | 'SYSTEM' | 'GENERAL';
  deduplicationKey?: string | null;
  aggregationCount: number;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  link?: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  collegeId: string;
  userId: string;
  channel: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
  enabledEventTypes: string[];
  isMuted: boolean;
  updatedAt: string;
}

export interface NotificationUserRule {
  id: string;
  collegeId: string;
  userId: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  digestFrequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  archiveAfterDays: number;
  mutedCategories: string[];
  mutedEventTypes: string[];
  updatedAt: string;
}

export interface NotificationDigestJob {
  id: string;
  collegeId: string;
  recipientId: string;
  digestType: 'DAILY' | 'WEEKLY';
  itemsCount: number;
  status: 'PENDING' | 'GENERATED' | 'DELIVERED';
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface NotificationCategoryInfo {
  id: string;
  label: string;
  description: string;
}

/* API Methods */

export async function fetchNotifications(params: { category?: string; isRead?: boolean; eventType?: string; page?: number; limit?: number } = {}): Promise<{ items: NotificationItem[]; total: number; unreadCount: number; hasMore: boolean }> {
  const qs = buildQueryString(params);
  return apiGet<{ items: NotificationItem[]; total: number; unreadCount: number; hasMore: boolean }>(`/notifications${qs}`);
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await apiGet<{ unreadCount: number }>('/notifications/unread-count');
  return res.unreadCount;
}

export async function markNotificationAsRead(id: string): Promise<NotificationItem> {
  return apiPatch<NotificationItem>(`/notifications/${id}/read`, {});
}

export async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  return apiPatch<{ count: number }>('/notifications/read-all', {});
}

export async function deleteNotification(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/notifications/${id}`);
}

export async function fetchNotificationPreferences(): Promise<NotificationPreference[]> {
  return apiGet<NotificationPreference[]>('/notifications/preferences');
}

export async function updateNotificationPreferences(data: { channel: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS'; enabledEventTypes?: string[]; isMuted?: boolean }): Promise<NotificationPreference> {
  return apiPatch<NotificationPreference>('/notifications/preferences', data);
}

export async function fetchNotificationCategories(): Promise<NotificationCategoryInfo[]> {
  return apiGet<NotificationCategoryInfo[]>('/notifications/categories');
}

export async function fetchNotificationRules(): Promise<NotificationUserRule | null> {
  return apiGet<NotificationUserRule | null>('/notifications/rules');
}

export async function updateNotificationRules(data: Partial<NotificationUserRule>): Promise<NotificationUserRule> {
  return apiPatch<NotificationUserRule>('/notifications/rules', data);
}

export async function fetchNotificationDigests(): Promise<NotificationDigestJob[]> {
  return apiGet<NotificationDigestJob[]>('/notifications/digests');
}

export async function generateNotificationDigest(digestType: 'DAILY' | 'WEEKLY' = 'DAILY'): Promise<NotificationDigestJob> {
  return apiPost<NotificationDigestJob>('/notifications/digests/generate', { digestType });
}
