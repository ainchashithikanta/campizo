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
import { ListingUnavailableError } from '../src/errors/domain-errors.js';

class MockEventBus implements EventBus {
  public publishedEvents: Array<{ eventType: string; payload: any }> = [];
  async publish(eventType: string, payload: unknown): Promise<void> {
    this.publishedEvents.push({ eventType, payload });
  }
}

describe('Campus Marketplace Moderation Queue', () => {
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
  const moderatorId = 'user-moderator-777';

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

  async function createPublishedListing(): Promise<string> {
    const draft = await useCases.createListingDraft({
      collegeId,
      sellerUserId: sellerId,
      categoryCode: 'calculators',
      title: 'CASIO FX-991ES+ Calculator',
      conditionCode: 'LIKE_NEW',
      priceInr: 900.0,
      pickupLocationName: 'Hostel Block 4'
    });
    const published = await useCases.publishListing(draft.id, collegeId, sellerId);
    return published.id;
  }

  async function quarantineListing(listingId: string): Promise<void> {
    await useCases.reportListing(collegeId, 'buyer-1', listingId, 'SPAM');
    await useCases.reportListing(collegeId, 'buyer-2', listingId, 'SPAM');
    await useCases.reportListing(collegeId, 'buyer-3', listingId, 'SPAM');
  }

  it('should auto-quarantine a listing after 3 reports and surface it in the moderation queue', async () => {
    const listingId = await createPublishedListing();

    await useCases.reportListing(collegeId, 'buyer-1', listingId, 'SPAM');
    await useCases.reportListing(collegeId, 'buyer-2', listingId, 'SPAM');

    let listing = await listingRepo.findById(listingId, collegeId);
    expect(listing?.status).toBe('PUBLISHED');
    await expect(queries.getModerationQueue(collegeId)).resolves.toHaveLength(0);

    // 3rd Report triggers Quarantine
    await useCases.reportListing(collegeId, 'buyer-3', listingId, 'SPAM');

    listing = await listingRepo.findById(listingId, collegeId);
    expect(listing?.status).toBe('QUARANTINED');

    const queue = await queries.getModerationQueue(collegeId);
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(listingId);
    expect(queue[0].status).toBe('QUARANTINED');
  });

  it('should restore a quarantined listing to PUBLISHED and remove it from the moderation queue', async () => {
    const listingId = await createPublishedListing();
    await quarantineListing(listingId);

    const restored = await useCases.moderateListing({
      listingId,
      collegeId,
      moderatorUserId: moderatorId,
      action: 'RESTORE',
      reasonNote: 'Reports reviewed and found to be false positives.'
    });

    expect(restored.status).toBe('PUBLISHED');

    const queue = await queries.getModerationQueue(collegeId);
    expect(queue).toHaveLength(0);

    expect(eventBus.publishedEvents.some((e) => e.eventType === 'ListingPublished')).toBe(true);
    expect(auditRepo.logs.some((log) => log.aggregateId === listingId && log.action === 'MODERATION_RESTORE')).toBe(
      true
    );
  });

  it('should delete a quarantined listing and remove it from the moderation queue', async () => {
    const listingId = await createPublishedListing();
    await quarantineListing(listingId);

    const deleted = await useCases.moderateListing({
      listingId,
      collegeId,
      moderatorUserId: moderatorId,
      action: 'DELETE'
    });

    expect(deleted.status).toBe('DELETED');

    const queue = await queries.getModerationQueue(collegeId);
    expect(queue).toHaveLength(0);

    expect(eventBus.publishedEvents.some((e) => e.eventType === 'ListingDeleted')).toBe(true);
    expect(auditRepo.logs.some((log) => log.aggregateId === listingId && log.action === 'MODERATION_DELETE')).toBe(
      true
    );
  });

  it('should throw ListingUnavailableError when moderating a missing listing', async () => {
    await expect(
      useCases.moderateListing({
        listingId: 'list-missing',
        collegeId,
        moderatorUserId: moderatorId,
        action: 'DELETE'
      })
    ).rejects.toThrow(ListingUnavailableError);
  });
});
