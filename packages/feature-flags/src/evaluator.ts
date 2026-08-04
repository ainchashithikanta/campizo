import type { FeatureFlagRule, FeatureEvaluationContext } from './types.js';
import type { FeatureFlagStore } from './store.js';
import type { FeatureFlagCache } from './cache.js';

export class FeatureFlagEngine {
  private store: FeatureFlagStore;
  private cache?: FeatureFlagCache | undefined;

  constructor(store: FeatureFlagStore, cache?: FeatureFlagCache) {
    this.store = store;
    this.cache = cache;
  }

  /**
   * Deterministic Murmur-like string hash returning value between 0 and 99
   */
  public static hashSeed(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Evaluates if a feature flag is active for a given tenant / request context
   */
  public isEnabled(flagKey: string, context: FeatureEvaluationContext = {}): boolean {
    // 1. Fetch from Cache or Store
    let rule: FeatureFlagRule | null = this.cache ? this.cache.get(flagKey) : null;

    if (!rule) {
      rule = this.store.getFlag(flagKey);
      if (!rule) {
        // Safe default: missing flag defaults to false
        return false;
      }
      if (this.cache) {
        this.cache.set(flagKey, rule);
      }
    }

    // 2. Check Master Enable Toggle
    if (!rule.enabled) return false;

    // 3. Environment Check
    const currentEnv = context.environment || process.env.NODE_ENV || 'development';
    if (rule.environments && rule.environments.length > 0) {
      if (!rule.environments.includes(currentEnv)) {
        return false;
      }
    }

    // 4. Time Window Activation Check
    const now = new Date();
    if (rule.validFrom && now < rule.validFrom) return false;
    if (rule.validUntil && now > rule.validUntil) return false;

    // 5. Per-College Targeted Whitelist Check
    if (rule.collegeIds && rule.collegeIds.length > 0) {
      if (!context.collegeId || !rule.collegeIds.includes(context.collegeId)) {
        return false;
      }
    }

    // 6. User Targeted Whitelist Check (Beta Users)
    if (rule.userIds && rule.userIds.length > 0) {
      if (!context.userId || !rule.userIds.includes(context.userId)) {
        return false;
      }
    }

    // 7. Prerequisites Check
    if (rule.prerequisites && rule.prerequisites.length > 0) {
      for (const prereqKey of rule.prerequisites) {
        if (!this.isEnabled(prereqKey, context)) {
          return false;
        }
      }
    }

    // 8. Deterministic Percentage Rollout Check
    if (rule.percentageRollout !== undefined && rule.percentageRollout < 100) {
      if (rule.percentageRollout <= 0) return false;
      const seed = `${flagKey}:${context.collegeId || context.userId || 'anon'}`;
      const bucket = FeatureFlagEngine.hashSeed(seed);
      if (bucket >= rule.percentageRollout) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper method for tenant context module enablement checks (Backward Compatibility Helper)
   */
  public static isModuleEnabled(tenantContext: { enabledModules: string[] }, moduleId: string): boolean {
    return tenantContext.enabledModules.includes(moduleId);
  }
}
