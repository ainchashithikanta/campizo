import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConfessionUseCases } from '../use-cases/confession.use-cases.js';
import { ConfessionQueries } from '../queries/confession.queries.js';
import {
  createConfessionSchema,
  voteConfessionSchema,
  reportConfessionSchema
} from '../validators/confession.validators.js';

export class ConfessionController {
  constructor(
    private useCases: ConfessionUseCases,
    private queries: ConfessionQueries
  ) {}

  async createConfession(req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    const { collegeId, userId, requestId } = req.ctx;
    const body = createConfessionSchema.parse(req.body);

    const result = await this.useCases.createConfession({
      collegeId,
      userId,
      categoryCode: body.categoryCode,
      title: body.title,
      content: body.content
    });

    reply.status(201);
    return {
      success: true,
      data: result,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }

  async getConfessionDetail(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<unknown> {
    const { collegeId, userId, requestId } = req.ctx;

    const detail = await this.queries.getConfessionDetail(req.params.id, collegeId, userId);
    if (!detail) {
      reply.status(404).send({
        success: false,
        error: { code: 'CONFESSION_NOT_FOUND', message: `Confession ${req.params.id} not found.` },
        metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
      });
      return;
    }

    reply.status(200);
    return {
      success: true,
      data: detail,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }

  async voteConfession(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<unknown> {
    const { collegeId, userId, requestId } = req.ctx;
    const body = voteConfessionSchema.parse(req.body);

    await this.useCases.voteConfession({
      collegeId,
      confessionId: req.params.id,
      voterUserId: userId,
      authorUserId: 'user-author-other',
      voteType: body.voteType
    });

    reply.status(200);
    return {
      success: true,
      data: { voted: true },
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }

  async bookmarkConfession(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<unknown> {
    const { collegeId, userId, requestId } = req.ctx;

    await this.useCases.bookmarkConfession({
      collegeId,
      confessionId: req.params.id,
      userId
    });

    reply.status(200);
    return {
      success: true,
      data: { bookmarked: true },
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }

  async reportConfession(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<unknown> {
    const { collegeId, userId, requestId } = req.ctx;
    const body = reportConfessionSchema.parse(req.body);

    await this.useCases.reportConfession({
      collegeId,
      confessionId: req.params.id,
      reporterUserId: userId,
      reasonCode: body.reasonCode,
      ...(body.details !== undefined ? { details: body.details } : {})
    });

    reply.status(200);
    return {
      success: true,
      data: { reported: true },
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }
}
