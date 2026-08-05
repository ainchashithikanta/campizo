/**
 * Campus Connect — Activity Controller (~30 lines)
 * Thin REST Controller delegating activity feed retrieval to ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectQueryService } from '../queries/connect.queries.js';

export class ActivityController {
  constructor(private readonly queryService: ConnectQueryService) {}

  async getActivityFeed(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const activities = await this.queryService.getActivities(request.connectContext.collegeId);
    reply.send(formatApiV1Success(activities, request));
  }
}
