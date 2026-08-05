/**
 * Campus Connect — Connection Controller (~50 lines)
 * Thin REST Controller delegating connection requests and decisions to ConnectUseCases and ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../queries/connect.queries.js';
import {
  sendConnectionRequestSchema,
  connectionDecisionSchema,
  blockConnectionSchema
} from '../validators/connection.validators.js';

export class ConnectionController {
  constructor(
    private readonly useCases: ConnectUseCases,
    private readonly queryService: ConnectQueryService
  ) {}

  async requestConnection(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = sendConnectionRequestSchema.parse(request.body);
    const reqId = `req_${Date.now()}`;
    const result = await this.useCases.sendConnectionRequest({
      id: reqId,
      collegeId: request.connectContext.collegeId,
      senderProfileId: request.connectContext.userId,
      receiverProfileId: input.receiverProfileId,
      originatingIntentId: input.originatingIntentId,
      note: input.note,
      createdBy: request.connectContext.userId
    });
    reply.status(201).send(formatApiV1Success(result, request));
  }

  async acceptConnection(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const { version } = connectionDecisionSchema.parse(request.body || { version: 1 });
    const connection = await this.useCases.acceptConnection(id, request.connectContext.collegeId, version);
    reply.send(formatApiV1Success(connection, request));
  }

  async rejectConnection(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const { version } = connectionDecisionSchema.parse(request.body || { version: 1 });
    await this.useCases.rejectConnection(id, request.connectContext.collegeId, version);
    reply.send(formatApiV1Success({ status: 'REJECTED', requestId: id }, request));
  }

  async blockConnection(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = blockConnectionSchema.parse(request.body);
    await this.useCases.blockConnection(request.connectContext.userId, input.blockedId, request.connectContext.collegeId);
    reply.send(formatApiV1Success({ status: 'BLOCKED', blockedId: input.blockedId }, request));
  }

  async getNetwork(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const network = await this.queryService.getStudentNetwork(request.connectContext.userId, request.connectContext.collegeId);
    reply.send(formatApiV1Success(network, request));
  }
}
