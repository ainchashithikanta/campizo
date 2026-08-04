/**
 * Pack Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class PackController {
  constructor(private readonly useCases: FeatureUseCases) {}

  /** POST /api/v1/feature-flags/packs */
  async createPack(body: { packKey: string; memberFlagKeys: string[] }, ctx: RequestContext) {
    const res = await this.useCases.createPack(body.packKey, body.memberFlagKeys);
    return buildSuccessResponse(res, ctx);
  }
}
