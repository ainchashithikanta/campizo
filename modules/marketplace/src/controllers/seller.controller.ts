import { FastifyRequest, FastifyReply } from 'fastify';
import { MarketplaceQueries } from '../queries/marketplace.queries.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export class SellerController {
  constructor(private queries: MarketplaceQueries) {}

  async getSellerProfile(request: FastifyRequest<{ Params: { sellerId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const profile = await this.queries.getSellerProfile(request.params.sellerId, collegeId);
      return reply.status(200).send({ success: true, data: profile });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }
}
