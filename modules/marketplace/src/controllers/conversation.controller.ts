import { FastifyRequest, FastifyReply } from 'fastify';
import { MarketplaceUseCases } from '../use-cases/marketplace.use-cases.js';
import { MarketplaceQueries } from '../queries/marketplace.queries.js';
import { ConversationCreateSchema, MessageCreateSchema } from '../validators/marketplace.validators.js';
import { handleHttpError } from '../errors/http-error-handler.js';
import { DuplicateConversationError } from '../errors/domain-errors.js';

export class ConversationController {
  constructor(
    private useCases: MarketplaceUseCases,
    private queries: MarketplaceQueries
  ) {}

  async createOrGetConversation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const buyerUserId = (request.headers['x-user-id'] as string) || 'user-buyer-202';
      const body = ConversationCreateSchema.parse(request.body);

      try {
        const conv = await this.useCases.createConversation({
          collegeId,
          listingId: body.listingId,
          buyerUserId
        });
        return reply.status(201).send({ success: true, data: conv });
      } catch (err) {
        if (err instanceof DuplicateConversationError) {
          // Return existing conversation gracefully if duplicate
          return reply.status(200).send({
            success: true,
            data: { listingId: body.listingId, buyerUserId, isExisting: true }
          });
        }
        throw err;
      }
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async getMessages(request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const result = await this.queries.getConversationMessages(request.params.conversationId, collegeId);
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found.',
            timestamp: new Date().toISOString()
          }
        });
      }
      return reply.status(200).send({ success: true, data: result });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async sendMessage(request: FastifyRequest<{ Params: { conversationId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const senderUserId = (request.headers['x-user-id'] as string) || 'user-buyer-202';
      const body = MessageCreateSchema.parse(request.body);

      const message = await this.useCases.sendMessage({
        collegeId,
        conversationId: request.params.conversationId,
        senderUserId,
        content: body.content,
        messageType: body.messageType
      });

      return reply.status(201).send({ success: true, data: message });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }
}
