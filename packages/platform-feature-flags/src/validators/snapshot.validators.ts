import { z } from 'zod';

export const createSnapshotSchema = z.object({
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']).optional(),
  reasonNote: z.string().min(1)
});

export const restoreSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  environment: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION']).optional()
});
