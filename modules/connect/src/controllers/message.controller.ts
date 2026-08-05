/**
 * Campus Connect — Message Controller (~35 lines)
 * Thin REST Controller delegating message dispatching and read receipt marking to ConnectUseCases.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { sendMessageSchema, markReadSchema } from '../validators/message.validators.js';

export class MessageController {
  constructor(private readonly useCases: ConnectUseCases) {}

  async sendMessage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = sendMessageSchema.parse(request.body);
    const msgId = `msg_${Date.now()}`;
    const result = await this.useCases.sendMessage({
      id: msgId,
      collegeId: request.connectContext.collegeId,
      conversationId: input.conversationId,
      senderProfileId: request.connectContext.userId,
      content: input.content,
      createdBy: request.connectContext.userId
    });
    reply.status(201).send(formatApiV1Success(result, request));
  }

  async markRead(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = markReadSchema.parse(request.body);
    await this.useCases.markRead(input.conversationId, request.connectContext.userId, request.connectContext.collegeId);
    reply.send(formatApiV1Success({ status: 'READ', conversationId: input.conversationId }, request));
  }
}
