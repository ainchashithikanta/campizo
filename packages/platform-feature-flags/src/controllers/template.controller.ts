/**
 * Template Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class TemplateController {
  constructor(private readonly useCases: FeatureUseCases) {}

  /** POST /api/v1/feature-flags/templates */
  async createTemplate(body: { templateKey: string; presetName: string }, ctx: RequestContext) {
    const res = await this.useCases.createTemplate(body.templateKey, body.presetName);
    return buildSuccessResponse(res, ctx);
  }
}
