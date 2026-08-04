/**
 * Unified Notification Engine — Drizzle ORM Database Schema (MS-40 Production)
 * Defines normalized tables for notifications, preferences, delivery queue, digests, schedules, rules, rate limits, and device tokens.
 */

import { pgTable, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    recipientId: text('recipient_id').notNull(),
    actorId: text('actor_id').notNull(),
    eventType: text('event_type').notNull(),
    category: text('category').notNull().default('GENERAL'), // 'MARKETPLACE' | 'PLACEMENT' | 'ACADEMIC' | 'SECURITY' | 'CAMPUS_CONNECT' | 'RATE_MY_PROFESSOR' | 'SYSTEM' | 'GENERAL'
    deduplicationKey: text('deduplication_key'),
    aggregationCount: integer('aggregation_count').notNull().default(1),
    title: text('title').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    link: text('link'),
    priority: text('priority').notNull().default('NORMAL'), // 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table: any) => ({
    recipientUnreadIdx: index('idx_notif_recipient_unread').on(table.collegeId, table.recipientId, table.isRead),
    recipientCategoryIdx: index('idx_notif_recipient_cat').on(table.recipientId, table.category),
    dedupKeyIdx: index('idx_notif_dedup_key').on(table.recipientId, table.deduplicationKey)
  })
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: text('id').primaryKey(),
    collegeId: text('college_id').notNull(),
    userId: text('user_id').notNull(),
    channel: text('channel').notNull().default('IN_APP'), // 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS'
    enabledEventTypes: jsonb('enabled_event_types').$type<string[]>().notNull().default([]),
    isMuted: boolean('is_muted').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    userChannelIdx: uniqueIndex('idx_pref_user_channel').on(table.collegeId, table.userId, table.channel)
  })
);

export const notificationChannels = pgTable('notification_channels', {
  id: text('id').primaryKey(),
  channelName: text('channel_name').notNull().unique(), // 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS'
  isEnabled: boolean('is_enabled').notNull().default(true),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({})
});

export const notificationDeliveryQueue = pgTable(
  'notification_delivery_queue',
  {
    id: text('id').primaryKey(),
    notificationId: text('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id').notNull(),
    channel: text('channel').notNull().default('IN_APP'),
    priority: text('priority').notNull().default('NORMAL'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('QUEUED'), // 'QUEUED' | 'PROCESSING' | 'DELIVERED' | 'FAILED'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table: any) => ({
    queueStatusIdx: index('idx_queue_status_next').on(table.status, table.nextAttemptAt)
  })
);

export const notificationDigestJobs = pgTable('notification_digest_jobs', {
  id: text('id').primaryKey(),
  collegeId: text('college_id').notNull(),
  recipientId: text('recipient_id').notNull(),
  digestType: text('digest_type').notNull(), // 'DAILY' | 'WEEKLY' | 'MONTHLY'
  itemsCount: integer('items_count').notNull().default(0),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'GENERATED' | 'DELIVERED'
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const notificationSchedule = pgTable('notification_schedule', {
  id: text('id').primaryKey(),
  collegeId: text('college_id').notNull(),
  recipientId: text('recipient_id').notNull(),
  notificationPayload: jsonb('notification_payload').$type<Record<string, unknown>>().notNull(),
  executeAt: timestamp('execute_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('SCHEDULED'), // 'SCHEDULED' | 'EXECUTED' | 'CANCELLED'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const notificationUserRules = pgTable('notification_user_rules', {
  id: text('id').primaryKey(),
  collegeId: text('college_id').notNull(),
  userId: text('user_id').notNull().unique(),
  quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
  quietHoursStart: text('quiet_hours_start').notNull().default('22:00'),
  quietHoursEnd: text('quiet_hours_end').notNull().default('07:00'),
  timezone: text('timezone').notNull().default('UTC'),
  digestFrequency: text('digest_frequency').notNull().default('INSTANT'), // 'INSTANT' | 'DAILY' | 'WEEKLY'
  archiveAfterDays: integer('archive_after_days').notNull().default(30),
  mutedCategories: jsonb('muted_categories').$type<string[]>().notNull().default([]),
  mutedEventTypes: jsonb('muted_event_types').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const notificationRateLimits = pgTable('notification_rate_limits', {
  id: text('id').primaryKey(),
  collegeId: text('college_id').notNull(),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  eventCount: integer('event_count').notNull().default(1),
  maxAllowed: integer('max_allowed').notNull().default(20),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const notificationDeviceTokens = pgTable('notification_device_tokens', {
  id: text('id').primaryKey(),
  collegeId: text('college_id').notNull(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  platform: text('platform').notNull().default('WEB'), // 'IOS' | 'ANDROID' | 'WEB'
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const notificationDeliveryAttempts = pgTable('notification_delivery_attempts', {
  id: text('id').primaryKey(),
  notificationId: text('notification_id')
    .notNull()
    .references(() => notifications.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'DELIVERED' | 'FAILED'
  attemptCount: integer('attempt_count').notNull().default(1),
  lastError: text('last_error'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true })
});
