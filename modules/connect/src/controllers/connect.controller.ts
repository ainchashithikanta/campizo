/**
 * Campus Connect — Student Profile & Discovery Controller (~45 lines)
 * Thin REST Controller delegating to ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectQueryService } from '../queries/connect.queries.js';
import { updateProfileSchema, discoveryQuerySchema } from '../validators/connect.validators.js';
import type { ConnectUseCases } from '../use-cases/connect.use-cases.js';

export class ConnectProfileController {
  constructor(
    private readonly queryService: ConnectQueryService,
    private readonly useCases?: ConnectUseCases
  ) {}

  async getMyProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const profile = await this.queryService.getStudentProfile(
      request.connectContext.userId,
      request.connectContext.collegeId
    );
    reply.send(formatApiV1Success(profile, request));
  }

  async updateMyProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId, collegeId } = request.connectContext;
    const body = updateProfileSchema.parse(request.body);

    const existing = (await this.useCases?.repoProvider.profileRepo.findById(userId, collegeId)) || {
      id: userId,
      userId,
      collegeId,
      gender: request.connectContext.gender,
      version: 1
    };

    const merged = { ...existing, ...body, id: userId, userId, collegeId, updatedAt: new Date() };
    const version = existing.version || 1;
    await this.useCases?.repoProvider.profileRepo.update(merged, version);

    reply.send(formatApiV1Success({ profileId: userId, ...body, status: 'UPDATED' }, request));
  }

  async getDiscoveryFeed(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = discoveryQuerySchema.parse(request.query);
    const feed = await this.queryService.getDiscoveryFeed(
      request.connectContext.collegeId,
      query.intentType,
      query.limit,
      query.page
    );
    reply.send(formatApiV1Success(feed, request));
  }
}
