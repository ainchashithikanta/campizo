/**
 * CacheRebuilder
 * Rebuilds L1 memory cache and Redis cache from database source-of-truth.
 */

import { FeatureEvaluationService } from '../services/feature-evaluation.service.js';
import { FeatureFlagEntity } from '../domain/repository.interface.js';

export class CacheRebuilder {
  constructor(private readonly evalService: FeatureEvaluationService) {}

  /**
   * Rebuilds L1 memory cache from database entities.
   * Expected complexity: O(N).
   */
  rebuildL1Cache(entities: FeatureFlagEntity[]): { rebuiltCount: number; durationMs: number } {
    const start = performance.now();
    const contexts = entities.map((e) => ({
      flagKey: e.flagKey,
      environment: e.environment as any,
      defaultState: e.defaultState,
      lifecycleStage: e.lifecycleStage as any,
      configurationVersion: e.version
    }));

    this.evalService.preloadL1Cache(contexts);
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    return {
      rebuiltCount: entities.length,
      durationMs
    };
  }
}
