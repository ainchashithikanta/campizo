import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { TenantContext } from '@college-hub/types';
import { resolveApiIdentity, isModerator } from '@college-hub/security';
import { ListingController } from '../controllers/listing.controller.js';
import { OfferController } from '../controllers/offer.controller.js';
import { ReservationController } from '../controllers/reservation.controller.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { SellerController } from '../controllers/seller.controller.js';
import { UploadController } from '../controllers/upload.controller.js';
import { EngagementController } from '../controllers/engagement.controller.js';
import { MarketplaceUseCases } from '../use-cases/marketplace.use-cases.js';
import { MarketplaceQueries } from '../queries/marketplace.queries.js';
import { ListingModerationDecisionSchema } from '../validators/marketplace.validators.js';
import { ListingUnavailableError } from '../errors/domain-errors.js';
import { handleHttpError } from '../errors/http-error-handler.js';

type ResolvedIdentity =
  | { error: string }
  | {
      userId: string;
      collegeId: string;
      roles: string[];
      isAuthenticated: boolean;
    };

export async function registerMarketplaceRoutes(
  fastify: FastifyInstance,
  opts: { useCases: MarketplaceUseCases; queries: MarketplaceQueries }
) {
  const resolveIdentity = (request: FastifyRequest): ResolvedIdentity => {
    const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
    const resolution = resolveApiIdentity({
      authorizationHeader: request.headers['authorization'] as string | undefined,
      collegeIdHeader: (request.headers['x-college-id'] as string) || tenantContext.collegeId,
      userIdHeader: request.headers['x-user-id'] as string | undefined
    });

    if (resolution.status === 'invalid_token' || resolution.status === 'config_error') {
      return { error: resolution.message };
    }

    const identity = resolution.identity;
    const headerCollegeId = (request.headers['x-college-id'] as string) || tenantContext.collegeId;
    return {
      userId: identity.userId,
      // Admin-console tokens scope collegeId to '*' (cross-tenant). Honor the
      // explicit x-college-id header in that case so admin actions target the
      // intended tenant instead of an empty wildcard queue.
      collegeId: identity.collegeId === '*' ? headerCollegeId : identity.collegeId || headerCollegeId,
      roles: identity.roles,
      isAuthenticated: identity.isAuthenticated
    };
  };

  const denyModeration = (reply: FastifyReply) => {
    reply.status(403).send({
      success: false,
      error: { code: 'MODERATION_ACCESS_DENIED', message: 'Moderation privileges required to access this endpoint.' }
    });
  };
  const listingCtrl = new ListingController(opts.useCases, opts.queries);
  const offerCtrl = new OfferController(opts.useCases);
  const resCtrl = new ReservationController(opts.useCases, opts.queries);
  const convCtrl = new ConversationController(opts.useCases, opts.queries);
  const sellerCtrl = new SellerController(opts.queries);
  const uploadCtrl = new UploadController();
  const engCtrl = new EngagementController(opts.useCases);

  // Listings Endpoints
  fastify.get('/api/v1/marketplace/listings', (req, reply) => listingCtrl.searchListings(req, reply));
  fastify.get('/api/v1/marketplace/listings/search', (req, reply) => listingCtrl.searchListings(req, reply));
  fastify.get('/api/v1/marketplace/listings/:listingId', (req, reply) =>
    listingCtrl.getListingDetail(req as any, reply)
  );
  fastify.post('/api/v1/marketplace/listings', (req, reply) => listingCtrl.createListing(req, reply));
  fastify.patch('/api/v1/marketplace/listings/:listingId/publish', (req, reply) =>
    listingCtrl.publishListing(req as any, reply)
  );

  // Offers Endpoints
  fastify.post('/api/v1/marketplace/listings/:listingId/offers', (req, reply) =>
    offerCtrl.submitOffer(req as any, reply)
  );
  fastify.post('/api/v1/marketplace/offers/:offerId/accept', (req, reply) => offerCtrl.acceptOffer(req as any, reply));

  // Reservations Endpoints (No direct creation endpoint allowed)
  fastify.get('/api/v1/marketplace/reservations/:reservationId', (req, reply) =>
    resCtrl.getReservationStatus(req as any, reply)
  );
  fastify.post('/api/v1/marketplace/reservations/:reservationId/complete', (req, reply) =>
    resCtrl.completeReservation(req as any, reply)
  );

  // Conversations Endpoints
  fastify.post('/api/v1/marketplace/conversations', (req, reply) => convCtrl.createOrGetConversation(req, reply));
  fastify.get('/api/v1/marketplace/conversations/:conversationId/messages', (req, reply) =>
    convCtrl.getMessages(req as any, reply)
  );
  fastify.post('/api/v1/marketplace/conversations/:conversationId/messages', (req, reply) =>
    convCtrl.sendMessage(req as any, reply)
  );

  // Seller Endpoints
  fastify.get('/api/v1/marketplace/sellers/:sellerId', (req, reply) => sellerCtrl.getSellerProfile(req as any, reply));

  // Upload Endpoints
  fastify.post('/api/v1/marketplace/uploads/session', (req, reply) => uploadCtrl.createUploadSession(req, reply));
  fastify.get('/api/v1/marketplace/uploads/:uploadId/status', (req, reply) =>
    uploadCtrl.getUploadStatus(req as any, reply)
  );

  // Engagement Endpoints
  fastify.post('/api/v1/marketplace/listings/:listingId/bookmark', (req, reply) =>
    engCtrl.bookmarkListing(req as any, reply)
  );
  fastify.post('/api/v1/marketplace/listings/:listingId/report', (req, reply) =>
    engCtrl.reportListing(req as any, reply)
  );

  // Moderation Endpoints
  fastify.get('/api/v1/marketplace/moderation/queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
    const identity = resolveIdentity(request);

    if ('error' in identity) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
      });
    }

    if (!isModerator(identity)) {
      return denyModeration(reply);
    }

    const queue = await opts.queries.getModerationQueue(tenantContext.collegeId);

    // Blind moderation — strip the listing owner's identity before returning.
    const blindQueue = queue.map((listing) => ({ ...listing, sellerUserId: 'BLIND' }));

    return reply.send({
      success: true,
      data: blindQueue,
      meta: {
        requestId: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  });

  fastify.post(
    '/api/v1/marketplace/moderation/listings/:listingId/decision',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Params: { listingId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const identity = resolveIdentity(request);

      if ('error' in identity) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
        });
      }

      if (!isModerator(identity)) {
        return denyModeration(reply);
      }

      const bodyResult = ListingModerationDecisionSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const updated = await opts.useCases.moderateListing({
          listingId: request.params.listingId,
          collegeId: tenantContext.collegeId,
          moderatorUserId: identity.userId,
          action: bodyResult.data.action,
          ...(bodyResult.data.reasonNote !== undefined ? { reasonNote: bodyResult.data.reasonNote } : {})
        });

        return reply.send({
          success: true,
          data: { listingId: updated.id, status: updated.status, action: bodyResult.data.action },
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        if (err instanceof ListingUnavailableError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        handleHttpError(err, request, reply);
      }
    }
  );
}
