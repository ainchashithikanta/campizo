import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import {
  InMemoryMarketplaceListingRepository,
  InMemoryOfferRepository,
  InMemoryReservationRepository,
  InMemoryConversationRepository,
  InMemorySellerProfileRepository,
  InMemoryMarketplaceStatisticsRepository,
  InMemoryBookmarkRepository,
  InMemoryReportRepository,
  InMemoryAuditRepository
} from '../src/repositories/in-memory-marketplace.repo.js';
import { MarketplaceUseCases } from '../src/use-cases/marketplace.use-cases.js';
import { MarketplaceQueries } from '../src/queries/marketplace.queries.js';
import { registerMarketplaceRoutes } from '../src/routes/marketplace.routes.js';

describe('Campus Marketplace Fastify REST API Integration', () => {
  let app: any;
  let listingRepo: InMemoryMarketplaceListingRepository;
  let offerRepo: InMemoryOfferRepository;
  let reservationRepo: InMemoryReservationRepository;
  let convRepo: InMemoryConversationRepository;
  let sellerRepo: InMemorySellerProfileRepository;
  let statsRepo: InMemoryMarketplaceStatisticsRepository;
  let bookmarkRepo: InMemoryBookmarkRepository;
  let reportRepo: InMemoryReportRepository;
  let auditRepo: InMemoryAuditRepository;

  const collegeId = 'college-stanford-001';
  const sellerUserId = 'user-seller-101';
  const buyerUserId = 'user-buyer-202';

  beforeEach(async () => {
    listingRepo = new InMemoryMarketplaceListingRepository();
    offerRepo = new InMemoryOfferRepository();
    reservationRepo = new InMemoryReservationRepository();
    convRepo = new InMemoryConversationRepository();
    sellerRepo = new InMemorySellerProfileRepository();
    statsRepo = new InMemoryMarketplaceStatisticsRepository();
    bookmarkRepo = new InMemoryBookmarkRepository();
    reportRepo = new InMemoryReportRepository();
    auditRepo = new InMemoryAuditRepository();

    const mockEventBus = { publish: async () => {} };

    const useCases = new MarketplaceUseCases(
      listingRepo,
      offerRepo,
      reservationRepo,
      convRepo,
      sellerRepo,
      bookmarkRepo,
      reportRepo,
      auditRepo,
      mockEventBus
    );

    const queries = new MarketplaceQueries(listingRepo, sellerRepo, statsRepo, convRepo, reservationRepo, bookmarkRepo);

    app = Fastify();
    await registerMarketplaceRoutes(app, { useCases, queries });
    await app.ready();
  });

  it('should create and publish a listing via REST endpoints', async () => {
    // 1. Create Draft
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/marketplace/listings',
      headers: {
        'x-college-id': collegeId,
        'x-user-id': sellerUserId,
        'x-request-id': 'req-001'
      },
      payload: {
        title: 'CASIO FX-991ES+ Calculator',
        categoryCode: 'calculators',
        conditionCode: 'LIKE_NEW',
        priceInr: 900.0,
        pickupLocationName: 'Hostel Block 4'
      }
    });

    expect(createRes.statusCode).toBe(201);
    const draft = JSON.parse(createRes.payload).data;
    expect(draft.status).toBe('DRAFT');

    // 2. Publish Listing
    const publishRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/marketplace/listings/${draft.id}/publish`,
      headers: {
        'x-college-id': collegeId,
        'x-user-id': sellerUserId,
        'x-request-id': 'req-002'
      }
    });

    expect(publishRes.statusCode).toBe(200);
    const published = JSON.parse(publishRes.payload).data;
    expect(published.status).toBe('PUBLISHED');
  });

  it('should reject self-purchase offer with HTTP 403', async () => {
    // Setup published listing
    const listing = await listingRepo.save({
      id: 'list-100',
      collegeId,
      sellerUserId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      slug: 'casio-calc',
      conditionCode: 'LIKE_NEW',
      listingType: 'SELL',
      priceInr: 900.0,
      isNegotiable: true,
      pickupLocationName: 'Hostel 4',
      status: 'PUBLISHED'
    });

    const offerRes = await app.inject({
      method: 'POST',
      url: `/api/v1/marketplace/listings/${listing.id}/offers`,
      headers: {
        'x-college-id': collegeId,
        'x-user-id': sellerUserId, // Self-purchase
        'x-request-id': 'req-003'
      },
      payload: { offeredPriceInr: 800.0 }
    });

    expect(offerRes.statusCode).toBe(403);
    const err = JSON.parse(offerRes.payload).error;
    expect(err.code).toBe('SELF_PURCHASE_NOT_ALLOWED');
  });

  it('should accept offer and lock listing to RESERVED status via REST', async () => {
    const listing = await listingRepo.save({
      id: 'list-200',
      collegeId,
      sellerUserId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      slug: 'casio-calc-2',
      conditionCode: 'LIKE_NEW',
      listingType: 'SELL',
      priceInr: 900.0,
      isNegotiable: true,
      pickupLocationName: 'Hostel 4',
      status: 'PUBLISHED'
    });

    // 1. Submit Offer
    const offerRes = await app.inject({
      method: 'POST',
      url: `/api/v1/marketplace/listings/${listing.id}/offers`,
      headers: {
        'x-college-id': collegeId,
        'x-user-id': buyerUserId,
        'x-request-id': 'req-004'
      },
      payload: { offeredPriceInr: 800.0 }
    });

    expect(offerRes.statusCode).toBe(201);
    const offer = JSON.parse(offerRes.payload).data;

    // 2. Accept Offer
    const acceptRes = await app.inject({
      method: 'POST',
      url: `/api/v1/marketplace/offers/${offer.id}/accept`,
      headers: {
        'x-college-id': collegeId,
        'x-user-id': sellerUserId,
        'x-request-id': 'req-005'
      }
    });

    expect(acceptRes.statusCode).toBe(200);
    const result = JSON.parse(acceptRes.payload).data;
    expect(result.offer.status).toBe('ACCEPTED');
    expect(result.reservation.status).toBe('ACTIVE');
  });

  it('should reuse existing conversation for same (Listing + Buyer)', async () => {
    const listing = await listingRepo.save({
      id: 'list-300',
      collegeId,
      sellerUserId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      slug: 'casio-calc-3',
      conditionCode: 'LIKE_NEW',
      listingType: 'SELL',
      priceInr: 900.0,
      isNegotiable: true,
      pickupLocationName: 'Hostel 4',
      status: 'PUBLISHED'
    });

    // First call creates conversation
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/marketplace/conversations',
      headers: {
        'x-college-id': collegeId,
        'x-user-id': buyerUserId,
        'x-request-id': 'req-006'
      },
      payload: { listingId: listing.id }
    });
    expect(res1.statusCode).toBe(201);

    // Second call reuses conversation gracefully (HTTP 200)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/marketplace/conversations',
      headers: {
        'x-college-id': collegeId,
        'x-user-id': buyerUserId,
        'x-request-id': 'req-007'
      },
      payload: { listingId: listing.id }
    });
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.payload).data.isExisting).toBe(true);
  });

  it('should create pre-signed upload session via REST', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/marketplace/uploads/session',
      headers: { 'x-request-id': 'req-008' },
      payload: {
        fileName: 'calc.webp',
        fileSizeBytes: 1048576,
        mimeType: 'image/webp'
      }
    });

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload).data;
    expect(data.uploadId).toBeDefined();
    expect(data.preSignedUrl).toContain('calc.webp');
  });
});
