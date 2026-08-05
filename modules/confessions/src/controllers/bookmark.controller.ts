import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConfessionQueries } from '../queries/confession.queries.js';

export class BookmarkController {
  constructor(private queries: ConfessionQueries) {}

  async getBookmarks(req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    const { collegeId, requestId } = req.ctx;
    const items = await this.queries.getFeed(collegeId, { limit: 10 });

    reply.status(200);
    return {
      success: true,
      data: items,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }
}
