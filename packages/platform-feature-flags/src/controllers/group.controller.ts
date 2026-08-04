/**
 * Feature Group Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class GroupController {
  constructor(private readonly useCases: FeatureUseCases) {}

  /** POST /api/v1/feature-flags/groups */
  async createGroup(body: { groupKey: string; title: string }, ctx: RequestContext) {
    const res = await this.useCases.createGroup(body.groupKey, body.title);
    return buildSuccessResponse(res, ctx);
  }
}
