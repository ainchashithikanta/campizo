import { z } from 'zod';

export const createRolloutSchema = z.object({
  flagKey: z.string().min(1),
  initialPercentage: z.number().min(0).max(100),
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']).optional()
});
