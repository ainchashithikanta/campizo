/**
 * Campus Connect — Student Profile & Discovery Controller (~45 lines)
 * Thin REST Controller delegating to ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectQueryService } from '../queries/connect.queries.js';
import { updateProfileSchema, discoveryQuerySchema } from '../validators/connect.validators.js';

export class ConnectProfileController {
  constructor(private readonly queryService: ConnectQueryService) {}

  async getMyProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const profile = await this.queryService.getStudentProfile(request.context.userId, request.context.collegeId);
    reply.send(formatApiV1Success(profile, request));
  }

  async updateMyProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = updateProfileSchema.parse(request.body);
    reply.send(formatApiV1Success({ profileId: request.context.userId, ...body, status: 'UPDATED' }, request));
  }

  async getDiscoveryFeed(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = discoveryQuerySchema.parse(request.query);
    const feed = await this.queryService.getDiscoveryFeed(
      request.context.collegeId,
      query.intentType,
      query.limit,
      query.page
    );
    reply.send(formatApiV1Success(feed, request));
  }
}
