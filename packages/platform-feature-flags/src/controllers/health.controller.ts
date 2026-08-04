/**
 * Health Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureQueries } from '../queries/feature.queries.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class HealthController {
  constructor(private readonly queries: FeatureQueries) {}

  /** GET /api/v1/feature-flags/health */
  async getHealth(ctx: RequestContext) {
    const res = await this.queries.getHealth();
    return buildSuccessResponse(res, ctx);
  }
}
