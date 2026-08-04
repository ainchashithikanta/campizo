/**
 * Campus Connect — Recommendation Zod Validators
 */

import { z } from 'zod';

export const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export type RecommendationQueryInput = z.infer<typeof recommendationQuerySchema>;
