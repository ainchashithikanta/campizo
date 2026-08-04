import { z } from 'zod';

export const createConfessionSchema = z.object({
  categoryCode: z.string().min(2).max(32),
  title: z.string().min(5).max(256),
  content: z.string().min(10).max(1000)
});

export const createCommentSchema = z.object({
  content: z.string().min(2).max(500),
  parentCommentId: z.string().uuid().optional()
});

export const voteConfessionSchema = z.object({
  voteType: z.enum(['UPVOTE', 'DOWNVOTE', 'REMOVE'])
});

export const reportConfessionSchema = z.object({
  reasonCode: z.string().min(2).max(32),
  details: z.string().max(500).optional()
});

export const moderationDecisionSchema = z.object({
  action: z.enum(['RESTORE', 'HIDE', 'DELETE', 'ESCALATE']),
  reasonNote: z.string().max(500).optional()
});

export const feedQuerySchema = z.object({
  tab: z.enum(['trending', 'latest']).optional(),
  categoryCode: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional()
});

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  categoryCode: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional()
});
