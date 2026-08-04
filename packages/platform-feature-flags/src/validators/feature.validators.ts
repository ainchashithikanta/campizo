import { z } from 'zod';

export const createFeatureSchema = z.object({
  flagKey: z.string().min(3).regex(/^[a-z0-9_-]+\.[a-z0-9_.-]+$/i),
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']).optional(),
  defaultState: z.boolean().optional(),
  ownerTeam: z.string().min(2)
});

export const toggleFeatureSchema = z.object({
  reason: z.string().optional()
});
