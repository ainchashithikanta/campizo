import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConfessionQueries } from '../queries/confession.queries.js';
import { feedQuerySchema, searchQuerySchema } from '../validators/confession.validators.js';

export class FeedController {
  constructor(private queries: ConfessionQueries) {}

  async getFeed(req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    const { collegeId, requestId } = req.ctx;
    const parsed = feedQuerySchema.parse(req.query);

    const options: { categoryCode?: string; tab?: 'trending' | 'latest'; cursor?: string; limit?: number } = {};
    if (parsed.tab !== undefined) options.tab = parsed.tab;
    if (parsed.categoryCode !== undefined) options.categoryCode = parsed.categoryCode;
    if (parsed.cursor !== undefined) options.cursor = parsed.cursor;
    if (parsed.limit !== undefined) options.limit = parsed.limit;

    const items = await this.queries.getFeed(collegeId, options);

    reply.status(200);
    return {
      success: true,
      data: items,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }

  async searchConfessions(req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    const { collegeId, requestId } = req.ctx;
    const parsed = searchQuerySchema.parse(req.query);

    const feedOptions: { categoryCode?: string } = {};
    if (parsed.categoryCode !== undefined) feedOptions.categoryCode = parsed.categoryCode;

    const items = await this.queries.getFeed(collegeId, feedOptions);
    const filtered = items.filter(
      (i) =>
        i.title.toLowerCase().includes(parsed.q.toLowerCase()) ||
        i.content.toLowerCase().includes(parsed.q.toLowerCase())
    );

    reply.status(200);
    return {
      success: true,
      data: filtered,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }

  async getCategories(req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    const { collegeId, requestId } = req.ctx;

    const categories = [
      { code: 'crush', name: '❤️ Crush', displayOrder: 1 },
      { code: 'academic', name: '🎓 Academic', displayOrder: 2 },
      { code: 'funny', name: '😂 Funny', displayOrder: 3 },
      { code: 'advice', name: '🤔 Advice', displayOrder: 4 },
      { code: 'rant', name: '😤 Rant', displayOrder: 5 },
      { code: 'confession', name: '💭 Confession', displayOrder: 6 }
    ];

    reply.status(200);
    return {
      success: true,
      data: categories,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }
}
