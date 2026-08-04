/**
 * Approval Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class ApprovalController {
  constructor(private readonly useCases: FeatureUseCases) {}

  /** POST /api/v1/feature-flags/approvals */
  async createApproval(body: { flagKey: string; policyTemplate: string }, ctx: RequestContext) {
    const res = await this.useCases.createApproval(body.flagKey, body.policyTemplate, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }

  /** POST /api/v1/feature-flags/approvals/:id/approve */
  async approve(approvalId: string, flagKey: string, ctx: RequestContext) {
    const res = await this.useCases.approve(approvalId, flagKey, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }

  /** POST /api/v1/feature-flags/approvals/:id/reject */
  async reject(approvalId: string, flagKey: string, body: { reason: string }, ctx: RequestContext) {
    const res = await this.useCases.reject(approvalId, flagKey, ctx.userId, body.reason);
    return buildSuccessResponse(res, ctx);
  }
}
