import { z } from 'zod';

export const createApprovalSchema = z.object({
  flagKey: z.string().min(1),
  policyTemplate: z.string().min(1)
});

export const decisionApprovalSchema = z.object({
  approvalId: z.string().min(1),
  flagKey: z.string().min(1),
  reason: z.string().optional()
});
