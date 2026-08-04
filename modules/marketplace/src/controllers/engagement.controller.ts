import { FastifyRequest, FastifyReply } from 'fastify';
import { MarketplaceUseCases } from '../use-cases/marketplace.use-cases.js';
import { ReportSchema } from '../validators/marketplace.validators.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export class EngagementController {
  constructor(private useCases: MarketplaceUseCases) {}

  async bookmarkListing(request: FastifyRequest<{ Params: { listingId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const userId = (request.headers['x-user-id'] as string) || 'user-buyer-202';

      await this.useCases.bookmarkListing(collegeId, userId, request.params.listingId);
      return reply.status(201).send({ success: true, data: { bookmarked: true } });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async reportListing(request: FastifyRequest<{ Params: { listingId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const reporterUserId = (request.headers['x-user-id'] as string) || 'user-buyer-202';
      const body = ReportSchema.parse(request.body);

      await this.useCases.reportListing(
        collegeId,
        reporterUserId,
        request.params.listingId,
        body.reasonCode,
        body.details
      );
      return reply.status(201).send({ success: true, data: { reported: true } });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }
}
