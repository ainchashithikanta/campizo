/**
 * Rollout Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class RolloutController {
  constructor(private readonly useCases: FeatureUseCases) {}

  /** POST /api/v1/feature-flags/:key/rollouts */
  async createRollout(body: { flagKey: string; initialPercentage: number }, ctx: RequestContext) {
    const res = await this.useCases.createRollout(body.flagKey, body.initialPercentage, ctx.environment);
    return buildSuccessResponse(res, ctx);
  }
}
