/**
 * Campus Connect — Recommendation Controller (~30 lines)
 * Thin REST Controller delegating recommendation retrieval strictly to ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectQueryService } from '../queries/connect.queries.js';
import { recommendationQuerySchema } from '../validators/recommendation.validators.js';

export class RecommendationController {
  constructor(private readonly queryService: ConnectQueryService) {}

  async getRecommendations(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = recommendationQuerySchema.parse(request.query || {});
    const recs = await this.queryService.getRecommendations(
      request.context.userId,
      request.context.collegeId,
      query.limit
    );
    reply.send(formatApiV1Success(recs, request));
  }
}
