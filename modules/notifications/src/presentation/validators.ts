/**
 * Unified Notification Engine — Zod Request Validators (MS-40 Production)
 */

import { z } from 'zod';

export const PublishNotificationSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  actorId: z.string().min(1, 'Actor ID is required'),
  actorName: z.string().optional(),
  eventType: z.string().min(1, 'Event type is required'),
  category: z
    .enum([
      'MARKETPLACE',
      'PLACEMENT',
      'ACADEMIC',
      'SECURITY',
      'CAMPUS_CONNECT',
      'RATE_MY_PROFESSOR',
      'SYSTEM',
      'GENERAL'
    ])
    .optional(),
  deduplicationKey: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.unknown()).optional(),
  link: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional()
});

export const NotificationFilterQuerySchema = z.object({
  category: z
    .enum([
      'MARKETPLACE',
      'PLACEMENT',
      'ACADEMIC',
      'SECURITY',
      'CAMPUS_CONNECT',
      'RATE_MY_PROFESSOR',
      'SYSTEM',
      'GENERAL'
    ])
    .optional(),
  isRead: z.coerce.boolean().optional(),
  isArchived: z.coerce.boolean().optional(),
  eventType: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10)
});

export const UpdatePreferencesSchema = z.object({
  channel: z.enum(['IN_APP', 'EMAIL', 'PUSH', 'SMS']),
  enabledEventTypes: z.array(z.string()).optional(),
  isMuted: z.boolean().optional()
});

export const UpdateRulesSchema = z.object({
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string().optional(),
  digestFrequency: z.enum(['INSTANT', 'DAILY', 'WEEKLY']).optional(),
  archiveAfterDays: z.number().optional(),
  mutedCategories: z
    .array(
      z.enum([
        'MARKETPLACE',
        'PLACEMENT',
        'ACADEMIC',
        'SECURITY',
        'CAMPUS_CONNECT',
        'RATE_MY_PROFESSOR',
        'SYSTEM',
        'GENERAL'
      ])
    )
    .optional(),
  mutedEventTypes: z.array(z.string()).optional()
});

export const GenerateDigestSchema = z.object({
  digestType: z.enum(['DAILY', 'WEEKLY']).default('DAILY')
});
