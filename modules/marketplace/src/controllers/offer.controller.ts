import { FastifyRequest, FastifyReply } from 'fastify';
import { MarketplaceUseCases } from '../use-cases/marketplace.use-cases.js';
import { OfferCreateSchema } from '../validators/marketplace.validators.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export class OfferController {
  constructor(private useCases: MarketplaceUseCases) {}

  async submitOffer(request: FastifyRequest<{ Params: { listingId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const buyerUserId = (request.headers['x-user-id'] as string) || 'user-buyer-202';
      const body = OfferCreateSchema.parse(request.body);

      const offer = await this.useCases.submitOffer({
        collegeId,
        listingId: request.params.listingId,
        buyerUserId,
        offeredPriceInr: body.offeredPriceInr,
        message: body.message
      });

      return reply.status(201).send({ success: true, data: offer });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async acceptOffer(request: FastifyRequest<{ Params: { offerId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const sellerUserId = (request.headers['x-user-id'] as string) || 'user-seller-101';

      const result = await this.useCases.acceptOffer(request.params.offerId, collegeId, sellerUserId);
      return reply.status(200).send({ success: true, data: result });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }
}
