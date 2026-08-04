/**
 * Analytics Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureQueries } from '../queries/feature.queries.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class AnalyticsController {
  constructor(private readonly queries: FeatureQueries) {}

  /** GET /api/v1/feature-flags/telemetry */
  async getTelemetry(flagKey: string | undefined, ctx: RequestContext) {
    const res = await this.queries.getAnalytics(flagKey);
    return buildSuccessResponse(res, ctx);
  }
}
