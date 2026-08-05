/**
 * Campus Connect — Conversation Controller (~35 lines)
 * Thin REST Controller delegating to ConnectUseCases and ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../queries/connect.queries.js';
import { createConversationSchema } from '../validators/message.validators.js';

export class ConversationController {
  constructor(
    private readonly useCases: ConnectUseCases,
    private readonly queryService: ConnectQueryService
  ) {}

  async createConversation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = createConversationSchema.parse(request.body);
    const convId = `conv_${Date.now()}`;
    const result = await this.useCases.createConversation({
      id: convId,
      collegeId: request.connectContext.collegeId,
      conversationType: input.conversationType,
      contextType: input.contextType,
      contextId: input.contextId,
      title: input.title,
      createdBy: request.connectContext.userId
    });
    reply.status(201).send(formatApiV1Success(result, request));
  }

  async getConversation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const conv = await this.queryService.getConversation(id, request.connectContext.collegeId);
    reply.send(formatApiV1Success(conv, request));
  }
}
