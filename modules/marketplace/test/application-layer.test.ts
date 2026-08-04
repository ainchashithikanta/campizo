import { describe, it, expect, beforeEach } from 'vitest';
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
import { MarketplaceUseCases, EventBus } from '../src/use-cases/marketplace.use-cases.js';
import { MarketplaceQueries } from '../src/queries/marketplace.queries.js';
import {
  SelfPurchaseNotAllowedError,
  CrossCollegeOperationError,
  DuplicateConversationError,
  DuplicateBookmarkError,
  DuplicateReportError,
  ListingUnavailableError
} from '../src/errors/domain-errors.js';

class MockEventBus implements EventBus {
  public publishedEvents: Array<{ eventType: string; payload: any }> = [];
  async publish(eventType: string, payload: unknown): Promise<void> {
    this.publishedEvents.push({ eventType, payload });
  }
}

describe('Campus Marketplace Application Layer Use Cases', () => {
  let listingRepo: InMemoryMarketplaceListingRepository;
  let offerRepo: InMemoryOfferRepository;
  let reservationRepo: InMemoryReservationRepository;
  let convRepo: InMemoryConversationRepository;
  let sellerRepo: InMemorySellerProfileRepository;
  let statsRepo: InMemoryMarketplaceStatisticsRepository;
  let bookmarkRepo: InMemoryBookmarkRepository;
  let reportRepo: InMemoryReportRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: MockEventBus;
  let useCases: MarketplaceUseCases;
  let queries: MarketplaceQueries;

  const collegeId = 'college-stanford-001';
  const sellerId = 'user-seller-101';
  const buyerId = 'user-buyer-202';

  beforeEach(() => {
    listingRepo = new InMemoryMarketplaceListingRepository();
    offerRepo = new InMemoryOfferRepository();
    reservationRepo = new InMemoryReservationRepository();
    convRepo = new InMemoryConversationRepository();
    sellerRepo = new InMemorySellerProfileRepository();
    statsRepo = new InMemoryMarketplaceStatisticsRepository();
    bookmarkRepo = new InMemoryBookmarkRepository();
    reportRepo = new InMemoryReportRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new MockEventBus();

    useCases = new MarketplaceUseCases(
      listingRepo,
      offerRepo,
      reservationRepo,
      convRepo,
      sellerRepo,
      bookmarkRepo,
      reportRepo,
      auditRepo,
      eventBus
    );

    queries = new MarketplaceQueries(listingRepo, sellerRepo, statsRepo, convRepo, reservationRepo, bookmarkRepo);
  });

  it('should create a listing draft and publish it', async () => {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO FX-991ES+ Calculator',
      conditionCode: 'LIKE_NEW',
      priceInr: 900.0,
      pickupLocationName: 'Hostel Block 4',
      mediaUrls: ['https://storage.collegehub.edu/img1.webp']
    });

    expect(draft.status).toBe('DRAFT');

    const published = await useCases.publishListing(draft.id, collegeId, sellerId);
    expect(published.status).toBe('PUBLISHED');
    expect(eventBus.publishedEvents.some((e) => e.eventType === 'ListingPublished')).toBe(true);
  });

  it('should prevent self-purchase offer', async () => {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      conditionCode: 'LIKE_NEW',
      priceInr: 900.0,
      pickupLocationName: 'Hostel 4'
    });
    await useCases.publishListing(draft.id, collegeId, sellerId);

    await expect(
      useCases.submitOffer({
        collegeId,
        listingId: draft.id,
        buyerUserId: sellerId, // Self purchase
        offeredPriceInr: 800.0
      })
    ).rejects.toThrow(SelfPurchaseNotAllowedError);
  });

  it('should execute full Offer Acceptance & 24-Hour Reservation Flow', async () => {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      conditionCode: 'LIKE_NEW',
      priceInr: 900.0,
      pickupLocationName: 'Hostel 4'
    });
    const published = await useCases.publishListing(draft.id, collegeId, sellerId);

    const offer = await useCases.submitOffer({
      collegeId,
      listingId: published.id,
      buyerUserId: buyerId,
      offeredPriceInr: 800.0
    });

    expect(offer.status).toBe('CREATED');

    const { offer: acceptedOffer, reservation } = await useCases.acceptOffer(offer.id, collegeId, sellerId);
    expect(acceptedOffer.status).toBe('ACCEPTED');
    expect(reservation.status).toBe('ACTIVE');

    const updatedListing = await listingRepo.findById(published.id, collegeId);
    expect(updatedListing?.status).toBe('RESERVED');
    expect(updatedListing?.currentReservationId).toBe(reservation.id);

    expect(eventBus.publishedEvents.some((e) => e.eventType === 'ReservationCreated')).toBe(true);
  });

  it('should enforce conversation uniqueness per (Listing + Buyer)', async () => {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      conditionCode: 'LIKE_NEW',
      priceInr: 900.0,
      pickupLocationName: 'Hostel 4'
    });
    const published = await useCases.publishListing(draft.id, collegeId, sellerId);

    const conv1 = await useCases.createConversation({
      collegeId,
      listingId: published.id,
      buyerUserId: buyerId
    });
    expect(conv1.id).toBeDefined();

    await expect(
      useCases.createConversation({
        collegeId,
        listingId: published.id,
        buyerUserId: buyerId
      })
    ).rejects.toThrow(DuplicateConversationError);
  });

  it('should trigger automated 3-report quarantine circuit breaker', async () => {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      conditionCode: 'LIKE_NEW',
      priceInr: 900.0,
      pickupLocationName: 'Hostel 4'
    });
    const published = await useCases.publishListing(draft.id, collegeId, sellerId);

    await useCases.reportListing(collegeId, 'buyer-1', published.id, 'SPAM');
    await useCases.reportListing(collegeId, 'buyer-2', published.id, 'SPAM');

    let listing = await listingRepo.findById(published.id, collegeId);
    expect(listing?.status).toBe('PUBLISHED');

    // 3rd Report triggers Quarantine
    await useCases.reportListing(collegeId, 'buyer-3', published.id, 'SPAM');

    listing = await listingRepo.findById(published.id, collegeId);
    expect(listing?.status).toBe('QUARANTINED');
  });

  it('should complete reservation and set listing to SOLD', async () => {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator',
      conditionCode: 'LIKE_NEW',
      priceInr: 900.0,
      pickupLocationName: 'Hostel 4'
    });
    const published = await useCases.publishListing(draft.id, collegeId, sellerId);
    const offer = await useCases.submitOffer({
      collegeId,
      listingId: published.id,
      buyerUserId: buyerId,
      offeredPriceInr: 800.0
    });
    const { reservation } = await useCases.acceptOffer(offer.id, collegeId, sellerId);

    const soldListing = await useCases.completeReservation(reservation.id, collegeId, sellerId);
    expect(soldListing.status).toBe('SOLD');
    expect(eventBus.publishedEvents.some((e) => e.eventType === 'ListingSold')).toBe(true);
  });

  it('should retrieve listings via CQRS search and detail queries', async () => {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO Calculator ES+',
      conditionCode: 'LIKE_NEW',
      priceInr: 950.0,
      pickupLocationName: 'Library'
    });
    await useCases.publishListing(draft.id, collegeId, sellerId);

    const searchResult = await queries.searchListings(collegeId, { query: 'CASIO', categoryCode: 'calculators' });
    expect(searchResult.items.length).toBe(1);
    expect(searchResult.items[0].title).toContain('CASIO');

    const detail = await queries.getListingDetail(draft.id, collegeId);
    expect(detail?.listing.id).toBe(draft.id);
  });
});
