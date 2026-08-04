import { z } from 'zod';

export const evaluateFeatureSchema = z.object({
  flagKey: z.string().min(1),
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']).optional(),
  context: z
    .object({
      userId: z.string().optional(),
      collegeId: z.string().optional(),
      role: z.string().optional(),
      appVersion: z.string().optional()
    })
    .optional(),
  explain: z.boolean().optional()
});

export const bulkEvaluateSchema = z.object({
  flagKeys: z.array(z.string()).min(1),
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']).optional(),
  context: z.record(z.unknown()).optional()
});

export const simulateSchema = z.object({
  flagKey: z.string().min(1),
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']).optional(),
  sampleUserIds: z.array(z.string()).min(1),
  proposedRolloutPercentage: z.number().min(0).max(100)
});
