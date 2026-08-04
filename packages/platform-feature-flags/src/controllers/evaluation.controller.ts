/**
 * Evaluation Controller (Thin Controller)
 * ALL evaluation actions route exclusively through FeatureEvaluationService.
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureEvaluationService } from '../services/feature-evaluation.service.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class EvaluationController {
  constructor(private readonly evalService: FeatureEvaluationService) {}

  /** POST /api/v1/feature-flags/evaluate */
  async evaluate(
    body: { flagKey: string; context?: Record<string, unknown> | undefined; explain?: boolean | undefined },
    ctx: RequestContext
  ) {
    const result = this.evalService.evaluateFeature(
      body.flagKey,
      ctx.environment,
      body.context || {},
      body.explain ?? false,
      ctx.traceId
    );
    return buildSuccessResponse(result, ctx);
  }

  /** POST /api/v1/feature-flags/evaluate/bulk */
  async bulkEvaluate(
    body: { flagKeys: string[]; context?: Record<string, unknown> | undefined },
    ctx: RequestContext
  ) {
    const mapRes = this.evalService.bulkEvaluate(body.flagKeys, ctx.environment, body.context || {});
    const serialized = Object.fromEntries(mapRes);
    return buildSuccessResponse(serialized, ctx);
  }

  /** POST /api/v1/feature-flags/evaluate/dry-run */
  async dryRun(body: { flagKey: string; proposedContext?: Record<string, unknown> | undefined }, ctx: RequestContext) {
    const result = this.evalService.dryRun(body.flagKey, ctx.environment, body.proposedContext || {});
    return buildSuccessResponse(result, ctx);
  }

  /** POST /api/v1/feature-flags/evaluate/simulate */
  async simulate(body: { flagKey: string; sampleUserIds: string[]; proposedRolloutPercentage: number }, ctx: RequestContext) {
    const sim = this.evalService.simulate(body.flagKey, ctx.environment, body.sampleUserIds, body.proposedRolloutPercentage);
    return buildSuccessResponse(sim, ctx);
  }
}
