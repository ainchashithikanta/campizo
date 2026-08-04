/**
 * Campus Connect — Messaging & Conversation Zod Validators
 */

import { z } from 'zod';

export const createConversationSchema = z.object({
  conversationType: z.enum(['DIRECT', 'STUDY_GROUP', 'PROJECT_TEAM', 'MENTORSHIP']).default('DIRECT'),
  contextType: z.string().min(1),
  contextId: z.string().min(1),
  title: z.string().max(150).optional()
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(2000)
});

export const markReadSchema = z.object({
  conversationId: z.string().min(1)
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
