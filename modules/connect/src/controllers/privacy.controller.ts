/**
 * Campus Connect — Privacy Settings Controller (~35 lines)
 * Thin REST Controller delegating privacy operations to ConnectUseCases and ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../queries/connect.queries.js';
import { updatePrivacySchema } from '../validators/privacy.validators.js';

export class PrivacyController {
  constructor(
    private readonly useCases: ConnectUseCases,
    private readonly queryService: ConnectQueryService
  ) {}

  async getPrivacySettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const settings = await this.queryService.getPrivacySettings(
      request.connectContext.userId,
      request.connectContext.collegeId
    );
    reply.send(
      formatApiV1Success(
        settings || { studentProfileId: request.connectContext.userId, isGhostMode: false, isIncognitoMode: false },
        request
      )
    );
  }

  async updatePrivacySettings(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = updatePrivacySchema.parse(request.body);
    const updated = await this.useCases.updatePrivacy({
      studentProfileId: request.connectContext.userId,
      collegeId: request.connectContext.collegeId,
      isGhostMode: input.isGhostMode,
      isIncognitoMode: input.isIncognitoMode,
      version: input.version,
      updatedBy: request.connectContext.userId
    });
    reply.send(formatApiV1Success(updated, request));
  }
}
