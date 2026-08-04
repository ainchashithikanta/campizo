/**
 * Campus Connect — Student Profile & Discovery Zod Validators
 */

import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  major: z.string().max(100).optional(),
  classYear: z.number().int().min(2020).max(2035).optional(),
  skills: z.array(z.string()).optional(),
  courses: z.array(z.string()).optional()
});

export const discoveryQuerySchema = z.object({
  intentType: z.string().optional(),
  courseCode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1)
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DiscoveryQueryInput = z.infer<typeof discoveryQuerySchema>;
