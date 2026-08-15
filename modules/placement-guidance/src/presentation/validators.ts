/**
 * Placement Guidance Module — Zod Request Validators
 */

import { z } from 'zod';

export const SubmitExperienceSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companySlug: z.string().optional(),
  roleTitle: z.string().min(1, 'Role title is required'),
  jobType: z.enum(['INTERNSHIP', 'FULL_TIME']),
  branch: z.string().min(1, 'Branch is required'),
  cgpa: z.number().min(0).max(10),
  ctcOfferedLpa: z.number().optional(),
  stipendMonthly: z.number().optional(),
  offerStatus: z.enum(['ACCEPTED', 'REJECTED', 'PENDING']).optional(),
  difficultyRating: z.number().min(1).max(5).optional(),
  overallRating: z.number().min(1).max(5).optional(),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  preparationTips: z.string().optional(),
  isAnonymous: z.boolean().optional(),
  rounds: z
    .array(
      z.object({
        roundNumber: z.number(),
        roundName: z.string(),
        roundType: z.enum(['ONLINE_ASSESSMENT', 'TECHNICAL', 'SYSTEM_DESIGN', 'HR']),
        durationMinutes: z.number(),
        description: z.string(),
        topicsCovered: z.array(z.string()),
        questions: z
          .array(
            z.object({
              questionText: z.string(),
              questionCategory: z.enum(['ALGORITHMS', 'SYSTEM_DESIGN', 'BEHAVIORAL', 'LANGUAGE']),
              difficulty: z.enum(['EASY', 'MEDIUM', 'HARD'])
            })
          )
          .optional()
      })
    )
    .optional()
});

export const ExperienceFilterQuerySchema = z.object({
  companySlug: z.string().optional(),
  roleTitle: z.string().optional(),
  jobType: z.enum(['INTERNSHIP', 'FULL_TIME']).optional(),
  branch: z.string().optional(),
  minCgpa: z.coerce.number().optional(),
  minPackageLpa: z.coerce.number().optional(),
  difficulty: z.coerce.number().optional(),
  topic: z.string().optional(),
  query: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10)
});

export const CreateQuestionSchema = z.object({
  companyName: z.string().min(1, 'Company name required'),
  roleTitle: z.string().min(1, 'Role title required'),
  questionText: z.string().min(10, 'Question text must be at least 10 chars'),
  topic: z.string().min(1, 'Topic required'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  roundType: z.enum(['ONLINE_ASSESSMENT', 'TECHNICAL', 'SYSTEM_DESIGN', 'HR']).optional(),
  jobType: z.enum(['INTERNSHIP', 'FULL_TIME']).optional(),
  branch: z.string().optional(),
  batchYear: z.number().optional()
});

export const QuestionFilterQuerySchema = z.object({
  companyName: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  roleTitle: z.string().optional(),
  jobType: z.enum(['INTERNSHIP', 'FULL_TIME']).optional(),
  branch: z.string().optional(),
  query: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10)
});

export const CreateDiscussionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 chars'),
  content: z.string().min(10, 'Content must be at least 10 chars'),
  topic: z.string().min(1, 'Topic required'),
  companySlug: z.string().optional()
});

export const CreateReplySchema = z.object({
  content: z.string().min(5, 'Reply content must be at least 5 chars')
});

export const VoteSchema = z.object({
  direction: z.enum(['UPVOTE', 'DOWNVOTE'])
});

export const ModerationDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'FLAG', 'DELETE']),
  reasonNote: z.string().max(500).optional()
});
