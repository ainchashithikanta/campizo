import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConfessionUseCases } from '../use-cases/confession.use-cases.js';
import { createCommentSchema } from '../validators/confession.validators.js';

export class CommentController {
  constructor(private useCases: ConfessionUseCases) {}

  async createComment(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<unknown> {
    const { collegeId, userId, requestId } = req.ctx;
    const body = createCommentSchema.parse(req.body);

    const comment = await this.useCases.addComment({
      collegeId,
      confessionId: req.params.id,
      userId,
      content: body.content,
      ...(body.parentCommentId !== undefined ? { parentCommentId: body.parentCommentId } : {})
    });

    reply.status(201);
    return {
      success: true,
      data: comment,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }

  async softDeleteComment(
    req: FastifyRequest<{ Params: { commentId: string } }>,
    reply: FastifyReply
  ): Promise<unknown> {
    const { collegeId, requestId } = req.ctx;

    reply.status(200);
    return {
      success: true,
      data: { commentId: req.params.commentId, status: 'SOFT_DELETED', content: '[Comment removed by moderation]' },
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }
}
