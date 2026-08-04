/**
 * Feature Controller (Thin Controller)
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { FeatureQueries } from '../queries/feature.queries.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class FeatureController {
  constructor(
    private readonly useCases: FeatureUseCases,
    private readonly queries: FeatureQueries
  ) {}

  /** GET /api/v1/feature-flags */
  async listFlags(ctx: RequestContext) {
    const list = await this.queries.getFeatureList(ctx.environment);
    return buildSuccessResponse(list, ctx);
  }

  /** GET /api/v1/feature-flags/:key */
  async getFlag(flagKey: string, ctx: RequestContext) {
    const flag = await this.queries.getFeature(flagKey, ctx.environment);
    return buildSuccessResponse(flag, ctx);
  }

  /** POST /api/v1/feature-flags */
  async createFlag(body: { flagKey: string; ownerTeam: string; defaultState?: boolean | undefined }, ctx: RequestContext) {
    const created = await this.useCases.createFeature({
      flagKey: body.flagKey,
      environment: ctx.environment,
      defaultState: body.defaultState ?? false,
      ownerTeam: body.ownerTeam,
      operatorUserId: ctx.userId
    });
    return buildSuccessResponse(created, ctx);
  }

  /** POST /api/v1/feature-flags/:key/enable */
  async enableFlag(flagKey: string, ctx: RequestContext) {
    const res = await this.useCases.enableFeature(flagKey, ctx.environment, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }

  /** POST /api/v1/feature-flags/:key/disable */
  async disableFlag(flagKey: string, ctx: RequestContext) {
    const res = await this.useCases.disableFeature(flagKey, ctx.environment, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }
}
