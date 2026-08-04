/**
 * Snapshot Controller
 */

import { RequestContext } from '../middleware/request-context.js';
import { FeatureUseCases } from '../use-cases/feature.use-cases.js';
import { buildSuccessResponse } from '../errors/http-error-handler.js';

export class SnapshotController {
  constructor(private readonly useCases: FeatureUseCases) {}

  /** POST /api/v1/feature-flags/snapshots */
  async createSnapshot(body: { reasonNote: string }, ctx: RequestContext) {
    const res = await this.useCases.createSnapshot(ctx.environment, body.reasonNote, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }

  /** POST /api/v1/feature-flags/snapshots/:id/restore */
  async restoreSnapshot(snapshotId: string, ctx: RequestContext) {
    const res = await this.useCases.restoreSnapshot(snapshotId, ctx.environment, ctx.userId);
    return buildSuccessResponse(res, ctx);
  }
}
