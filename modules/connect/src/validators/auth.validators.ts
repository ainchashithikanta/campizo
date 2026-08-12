/**
 * Campus Connect — Student Auth Zod Validators
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(100),
  gender: z.enum(['MALE', 'FEMALE']),
  collegeId: z.string().min(1).max(100).optional()
});

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(128)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
