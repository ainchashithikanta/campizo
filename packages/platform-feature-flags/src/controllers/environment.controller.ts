/**
 * Environment Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureQueries } from '../queries/feature.queries.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class EnvironmentController {
  constructor(private readonly queries: FeatureQueries) {}

  /** GET /api/v1/feature-flags/environments/compare */
  async compare(ctx: RequestContext) {
    const list = await this.queries.getFeatureList(ctx.environment);
    return buildSuccessResponse({ environment: ctx.environment, flagCount: list.length }, ctx);
  }
}
