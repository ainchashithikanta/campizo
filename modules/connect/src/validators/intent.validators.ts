/**
 * Campus Connect — Intent Zod Validators
 */

import { z } from 'zod';

export const createIntentSchema = z.object({
  intentType: z.enum(['STUDY_PARTNER', 'PROJECT_COLLABORATOR', 'MENTORSHIP', 'SOCIAL_HANG_OUT', 'RESOURCE_SHARING']),
  title: z.string().min(3).max(150),
  description: z.string().max(1000).optional(),
  courseCode: z.string().max(20).optional(),
  priority: z.number().int().min(1).max(5).default(1)
});

export const updateIntentSchema = z.object({
  title: z.string().min(3).max(150),
  version: z.number().int().positive()
});

export const intentStateTransitionSchema = z.object({
  version: z.number().int().positive()
});

export type CreateIntentInput = z.infer<typeof createIntentSchema>;
export type UpdateIntentInput = z.infer<typeof updateIntentSchema>;
export type IntentStateTransitionInput = z.infer<typeof intentStateTransitionSchema>;
