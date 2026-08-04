/**
 * Campus Connect — Privacy Settings Zod Validators
 */

import { z } from 'zod';

export const updatePrivacySchema = z.object({
  isGhostMode: z.boolean(),
  isIncognitoMode: z.boolean(),
  version: z.number().int().positive().default(1)
});

export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
