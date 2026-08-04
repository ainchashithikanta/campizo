import { z } from 'zod';

export const FeatureFlagRuleSchema = z.object({
  key: z.string().min(1),
  description: z.string(),
  enabled: z.boolean().default(false),
  environments: z.array(z.string()).default(['development', 'test', 'testing', 'staging', 'production']),
  collegeIds: z.array(z.string()).optional(), // Target specific colleges
  userIds: z.array(z.string()).optional(), // Target specific beta users (foundation)
  percentageRollout: z.number().min(0).max(100).optional(), // 0 - 100% rollout
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  prerequisites: z.array(z.string()).optional(),
  version: z.number().default(1)
});

export type FeatureFlagRule = z.infer<typeof FeatureFlagRuleSchema>;

export interface FeatureEvaluationContext {
  collegeId?: string;
  userId?: string;
  environment?: string;
}

export interface FeatureFlagAuditRecord {
  flagKey: string;
  version: number;
  action: 'CREATED' | 'UPDATED' | 'ROLLBACK';
  oldRule?: FeatureFlagRule;
  newRule: FeatureFlagRule;
  updatedBy: string;
  timestamp: Date;
}
