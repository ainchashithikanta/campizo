import { FastifyRequest, FastifyReply } from 'fastify';
import { MarketplaceUseCases } from '../use-cases/marketplace.use-cases.js';
import { MarketplaceQueries } from '../queries/marketplace.queries.js';
import { ListingCreateSchema, SearchQuerySchema } from '../validators/marketplace.validators.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export class ListingController {
  constructor(
    private useCases: MarketplaceUseCases,
    private queries: MarketplaceQueries
  ) {}

  async searchListings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const parsed = SearchQuerySchema.parse(request.query);
      const result = await this.queries.searchListings(collegeId, parsed);

      return reply.status(200).send({
        success: true,
        data: result.items,
        meta: {
          requestId: request.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
          pagination: result.meta
        }
      });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async getListingDetail(request: FastifyRequest<{ Params: { listingId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const currentUserId = (request.headers['x-user-id'] as string) || undefined;
      const detail = await this.queries.getListingDetail(request.params.listingId, collegeId, currentUserId);
      if (!detail) {
        return reply.status(404).send({
          success: false,
          error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found.', timestamp: new Date().toISOString() }
        });
      }
      return reply.status(200).send({ success: true, data: detail });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async createListing(request: FastifyRequest, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const sellerUserId = (request.headers['x-user-id'] as string) || 'user-seller-101';
      const body = ListingCreateSchema.parse(request.body);

      const listing = await this.useCases.createListingDraft({
        collegeId,
        sellerUserId,
        ...body
      });

      return reply.status(201).send({ success: true, data: listing });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async publishListing(request: FastifyRequest<{ Params: { listingId: string } }>, reply: FastifyReply) {
    try {
      const collegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';
      const sellerUserId = (request.headers['x-user-id'] as string) || 'user-seller-101';

      const listing = await this.useCases.publishListing(request.params.listingId, collegeId, sellerUserId);
      return reply.status(200).send({ success: true, data: listing });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }
}
