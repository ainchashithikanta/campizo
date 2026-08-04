/**
 * Campus Connect — Connection Request & Decision Zod Validators
 */

import { z } from 'zod';

export const sendConnectionRequestSchema = z.object({
  receiverProfileId: z.string().min(1),
  originatingIntentId: z.string().min(1),
  note: z.string().max(300).optional()
});

export const connectionDecisionSchema = z.object({
  version: z.number().int().positive().default(1)
});

export const blockConnectionSchema = z.object({
  blockedId: z.string().min(1)
});

export type SendConnectionRequestInput = z.infer<typeof sendConnectionRequestSchema>;
export type ConnectionDecisionInput = z.infer<typeof connectionDecisionSchema>;
export type BlockConnectionInput = z.infer<typeof blockConnectionSchema>;
