import { FastifyInstance } from 'fastify';
import { ListingController } from '../controllers/listing.controller.js';
import { OfferController } from '../controllers/offer.controller.js';
import { ReservationController } from '../controllers/reservation.controller.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { SellerController } from '../controllers/seller.controller.js';
import { UploadController } from '../controllers/upload.controller.js';
import { EngagementController } from '../controllers/engagement.controller.js';
import { MarketplaceUseCases } from '../use-cases/marketplace.use-cases.js';
import { MarketplaceQueries } from '../queries/marketplace.queries.js';

export async function registerMarketplaceRoutes(
  fastify: FastifyInstance,
  opts: { useCases: MarketplaceUseCases; queries: MarketplaceQueries }
) {
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
}
