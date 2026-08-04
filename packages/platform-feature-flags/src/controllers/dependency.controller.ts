/**
 * Dependency Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureQueries } from '../queries/feature.queries.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class DependencyController {
  constructor(private readonly queries: FeatureQueries) {}

  /** GET /api/v1/feature-flags/dependencies/validate-graph */
  async validateGraph(ctx: RequestContext) {
    const graph = await this.queries.getDependencyGraph();
    return buildSuccessResponse({ valid: true, graph }, ctx);
  }
}
