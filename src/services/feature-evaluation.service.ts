/**
 * FeatureEvaluationService (MANDATORY EVALUATION AUTHORITY)
 * Sub-millisecond in-memory evaluation service utilizing the pluggable PolicyEngine.
 */

import { EvaluationResult, CacheSourceType, EnvironmentType } from '../domain/value-objects.js';
import { PolicyEngine, EvaluationContext } from '../policy-engine/policy-engine.js';

export class FeatureEvaluationService {
  private readonly policyEngine: PolicyEngine;
  private readonly memoryCache: Map<string, EvaluationContext> = new Map();

  constructor(policyEngine?: PolicyEngine) {
    this.policyEngine = policyEngine || new PolicyEngine();
  }

  /**
   * Preloads evaluation contexts into L1 process memory cache.
   * Execution complexity: O(N) where N is flag count.
   */
  preloadL1Cache(contexts: EvaluationContext[]): void {
    for (const ctx of contexts) {
      const cacheKey = `${ctx.environment}:${ctx.flagKey}`;
      this.memoryCache.set(cacheKey, ctx);
    }
  }

  /**
   * Evaluates a single feature flag returning an immutable EvaluationResult.
   * Target execution latency: < 1ms (pure in-memory).
   */
  evaluateFeature(
    flagKey: string,
    environment: EnvironmentType,
    overrides?: Partial<EvaluationContext>,
    explain: boolean = false
  ): EvaluationResult {
    const startTime = performance.now();
    const cacheKey = `${environment}:${flagKey}`;
    const cachedCtx = this.memoryCache.get(cacheKey);

    const context: EvaluationContext = {
      flagKey,
      environment,
      defaultState: false,
      lifecycleStage: 'PRODUCTION',
      ...cachedCtx,
      ...overrides
    };

    const { result, skippedRules } = this.policyEngine.evaluate(context);
    const durationMs = Math.round((performance.now() - startTime) * 1000) / 1000;

    return new EvaluationResult({
      enabled: result.enabled,
      reason: result.reason,
      matchedRule: result.matchedRule,
      evaluationTimeMs: durationMs,
      cacheSource: cachedCtx ? 'LOCAL_MEMORY' : 'FALLBACK_DEFAULT',
      evaluatedEnvironment: environment,
      explanation: explain
        ? {
            decisionExplanation: `Evaluated ${flagKey} in ${environment}: ${result.reason}`,
            skippedRules,
            evaluationTimeline: [{ policy: 'PolicyEnginePipeline', outcome: result.matchedRule, durationMs }]
          }
        : undefined
    });
  }

  /**
   * Evaluates multiple features in bulk.
   */
  bulkEvaluate(
    flagKeys: string[],
    environment: EnvironmentType,
    overrides?: Partial<EvaluationContext>
  ): Map<string, EvaluationResult> {
    const results = new Map<string, EvaluationResult>();
    for (const key of flagKeys) {
      results.set(key, this.evaluateFeature(key, environment, overrides));
    }
    return results;
  }

  /**
   * Evaluates all flags belonging to a module group.
   */
  evaluateModule(
    flagKeysInModule: string[],
    environment: EnvironmentType,
    overrides?: Partial<EvaluationContext>
  ): Map<string, EvaluationResult> {
    return this.bulkEvaluate(flagKeysInModule, environment, overrides);
  }

  /**
   * Evaluates all flags belonging to a Feature Pack.
   */
  evaluatePack(
    flagKeysInPack: string[],
    environment: EnvironmentType,
    packState: boolean,
    overrides?: Partial<EvaluationContext>
  ): Map<string, EvaluationResult> {
    return this.bulkEvaluate(flagKeysInPack, environment, {
      ...overrides,
      packOverrideState: packState
    });
  }

  /**
   * Dry-run evaluation without updating telemetry counters.
   */
  dryRun(flagKey: string, environment: EnvironmentType, proposedContext: Partial<EvaluationContext>): EvaluationResult {
    return this.evaluateFeature(flagKey, environment, proposedContext, true);
  }

  /**
   * Simulation mode testing target population impact.
   */
  simulate(
    flagKey: string,
    environment: EnvironmentType,
    sampleUserIds: string[],
    proposedRolloutPercentage: number
  ): { enabledCount: number; totalCount: number; matchPercentage: number } {
    let enabledCount = 0;
    for (const userId of sampleUserIds) {
      const res = this.evaluateFeature(flagKey, environment, {
        userId,
        rolloutPercentage: proposedRolloutPercentage
      });
      if (res.enabled) enabledCount++;
    }
    const totalCount = sampleUserIds.length;
    const matchPercentage = totalCount > 0 ? (enabledCount / totalCount) * 100 : 0;

    return { enabledCount, totalCount, matchPercentage };
  }
}
