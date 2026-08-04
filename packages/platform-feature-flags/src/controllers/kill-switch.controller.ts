/**
 * Kill Switch Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class KillSwitchController {
  constructor(private readonly useCases: FeatureUseCases) {}

  /** POST /api/v1/feature-flags/kill-switches/activate */
  async activate(body: { flagKey: string; reason: string }, ctx: RequestContext) {
    const res = await this.useCases.activateKillSwitch(body.flagKey, body.reason, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }

  /** POST /api/v1/feature-flags/kill-switches/deactivate */
  async deactivate(body: { flagKey: string }, ctx: RequestContext) {
    const res = await this.useCases.releaseKillSwitch(body.flagKey, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }
}
