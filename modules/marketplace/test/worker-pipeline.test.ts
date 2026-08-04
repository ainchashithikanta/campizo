import { describe, it, expect, beforeEach } from 'vitest';
import { DLQManager } from '../src/workers/dlq-manager.js';
import { VirusScanWorker } from '../src/workers/virus-scan.worker.js';
import { ImageOptimizationWorker } from '../src/workers/image-optimization.worker.js';
import { MetadataExtractionWorker } from '../src/workers/metadata-extraction.worker.js';
import { SearchIndexerWorker } from '../src/workers/search-indexer.worker.js';
import { StatisticsWorker } from '../src/workers/statistics.worker.js';
import { ReservationExpiryWorker } from '../src/workers/reservation-expiry.worker.js';
import { ModerationWorker } from '../src/workers/moderation.worker.js';
import { NotificationWorker } from '../src/workers/notification.worker.js';
import { MarketplaceEventRouter } from '../src/workers/event-router.js';
import {
  InMemoryMarketplaceListingRepository,
  InMemoryReservationRepository,
  InMemoryMarketplaceStatisticsRepository,
  InMemoryReportRepository
} from '../src/repositories/in-memory-marketplace.repo.js';

describe('Campus Marketplace Background Workers & Event Pipeline', () => {
  let dlqManager: DLQManager;
  let emittedEvents: Array<{ event: string; payload: any }>;
  let eventPublisher: (event: string, payload: unknown) => Promise<void>;

  let virusScanWorker: VirusScanWorker;
  let imageOptimWorker: ImageOptimizationWorker;
  let metadataWorker: MetadataExtractionWorker;
  let searchWorker: SearchIndexerWorker;
  let statsWorker: StatisticsWorker;
  let reservationExpiryWorker: ReservationExpiryWorker;
  let moderationWorker: ModerationWorker;
  let notificationWorker: NotificationWorker;
  let router: MarketplaceEventRouter;

  let listingRepo: InMemoryMarketplaceListingRepository;
  let reservationRepo: InMemoryReservationRepository;
  let statsRepo: InMemoryMarketplaceStatisticsRepository;
  let reportRepo: InMemoryReportRepository;

  const collegeId = 'college-stanford-001';

  beforeEach(() => {
    dlqManager = new DLQManager();
    emittedEvents = [];
    eventPublisher = async (event: string, payload: unknown) => {
      emittedEvents.push({ event, payload });
    };

    listingRepo = new InMemoryMarketplaceListingRepository();
    reservationRepo = new InMemoryReservationRepository();
    statsRepo = new InMemoryMarketplaceStatisticsRepository();
    reportRepo = new InMemoryReportRepository();

    virusScanWorker = new VirusScanWorker(dlqManager, eventPublisher);
    imageOptimWorker = new ImageOptimizationWorker(dlqManager, eventPublisher);
    metadataWorker = new MetadataExtractionWorker(dlqManager, eventPublisher);
    searchWorker = new SearchIndexerWorker(dlqManager, eventPublisher);
    statsWorker = new StatisticsWorker(statsRepo, dlqManager, eventPublisher);
    reservationExpiryWorker = new ReservationExpiryWorker(reservationRepo, listingRepo, dlqManager, eventPublisher);
    moderationWorker = new ModerationWorker(reportRepo, listingRepo, dlqManager, eventPublisher);
    notificationWorker = new NotificationWorker(dlqManager);

    router = new MarketplaceEventRouter(
      virusScanWorker,
      imageOptimWorker,
      metadataWorker,
      searchWorker,
      statsWorker,
      reservationExpiryWorker,
      moderationWorker,
      notificationWorker,
      dlqManager
    );
  });

  it('should process VirusScanWorker for CLEAN file and publish VirusScanCompleted', async () => {
    const res = await virusScanWorker.process({
      id: 'job-scan-1',
      name: 'VirusScanWorker',
      data: { uploadId: 'upl-1', collegeId, fileKey: 'photos/calc.webp' },
      attemptsMade: 1,
      maxAttempts: 3
    });

    expect(res.virusScanStatus).toBe('CLEAN');
    expect(emittedEvents.some((e) => e.event === 'VirusScanCompleted')).toBe(true);
  });

  it('should detect INFECTED file and publish VirusScanFailed', async () => {
    const res = await virusScanWorker.process({
      id: 'job-scan-2',
      name: 'VirusScanWorker',
      data: { uploadId: 'upl-2', collegeId, fileKey: 'photos/EICAR_TEST_VIRUS.exe' },
      attemptsMade: 1,
      maxAttempts: 3
    });

    expect(res.virusScanStatus).toBe('INFECTED');
    expect(emittedEvents.some((e) => e.event === 'VirusScanFailed')).toBe(true);
  });

  it('should execute parallel fan-out (ImageOptimization & MetadataExtraction) on VirusScanCompleted', async () => {
    await router.handleEvent('VirusScanCompleted', { uploadId: 'upl-10', collegeId, fileKey: 'photos/calc.webp' });

    expect(emittedEvents.some((e) => e.event === 'ImageOptimizationCompleted')).toBe(true);
    expect(emittedEvents.some((e) => e.event === 'MetadataExtracted')).toBe(true);
  });

  it('should index published listings via SearchIndexerWorker', async () => {
    await router.handleEvent('ListingPublished', { listingId: 'list-100', collegeId, title: 'CASIO Calculator' });

    expect(emittedEvents.some((e) => e.event === 'SearchIndexed')).toBe(true);
  });

  it('should update marketplace_statistics via StatisticsWorker', async () => {
    await router.handleEvent('ListingViewed', { listingId: 'list-200', collegeId });
    await router.handleEvent('BookmarkAdded', { listingId: 'list-200', collegeId });

    const stats = await statsRepo.findByListing('list-200', collegeId);
    expect(stats).toBeDefined();
    expect(stats?.totalViews).toBe(1);
    expect(stats?.totalBookmarks).toBe(1);
    expect(stats?.popularityScore).toBe(4); // 1 view + 3*1 bookmark = 4
  });

  it('should expire 24-hour reservation via ReservationExpiryWorker', async () => {
    const listing = await listingRepo.save({
      id: 'list-300',
      collegeId,
      sellerUserId: 'seller-1',
      categoryCode: 'calculators',
      title: 'CASIO Calc',
      slug: 'casio-calc-300',
      conditionCode: 'LIKE_NEW',
      listingType: 'SELL',
      priceInr: 900,
      isNegotiable: true,
      pickupLocationName: 'Hostel 4',
      status: 'RESERVED',
      currentReservationId: 'res-300'
    });

    await reservationRepo.save({
      id: 'res-300',
      collegeId,
      listingId: listing.id,
      offerId: 'off-300',
      buyerUserId: 'buyer-1',
      sellerUserId: 'seller-1',
      startsAt: new Date(),
      expiresAt: new Date(Date.now() - 1000), // Expired
      status: 'ACTIVE'
    });

    await router.handleEvent('ReservationCreated', { reservationId: 'res-300', listingId: listing.id, collegeId });

    const updatedListing = await listingRepo.findById(listing.id, collegeId);
    expect(updatedListing?.status).toBe('PUBLISHED');
    expect(updatedListing?.currentReservationId).toBeNull();
    expect(emittedEvents.some((e) => e.event === 'ReservationExpired')).toBe(true);
  });

  it('should quarantine listing when 3 reports accumulate via ModerationWorker', async () => {
    const listing = await listingRepo.save({
      id: 'list-400',
      collegeId,
      sellerUserId: 'seller-1',
      categoryCode: 'calculators',
      title: 'Spam Calc',
      slug: 'spam-calc',
      conditionCode: 'LIKE_NEW',
      listingType: 'SELL',
      priceInr: 900,
      isNegotiable: true,
      pickupLocationName: 'Hostel 4',
      status: 'PUBLISHED'
    });

    await reportRepo.save({ id: 'r1', collegeId, reporterUserId: 'u1', listingId: listing.id, reasonCode: 'SPAM' });
    await reportRepo.save({ id: 'r2', collegeId, reporterUserId: 'u2', listingId: listing.id, reasonCode: 'SPAM' });
    await reportRepo.save({ id: 'r3', collegeId, reporterUserId: 'u3', listingId: listing.id, reasonCode: 'SPAM' });

    await router.handleEvent('ListingReported', { listingId: listing.id, collegeId });

    const updatedListing = await listingRepo.findById(listing.id, collegeId);
    expect(updatedListing?.status).toBe('QUARANTINED');
    expect(emittedEvents.some((e) => e.event === 'ListingQuarantined')).toBe(true);
  });

  it('should enforce idempotency and push to DLQ upon job failure', async () => {
    const failingWorker = new VirusScanWorker(dlqManager, async () => {
      throw new Error('Storage service unavailable');
    });

    const job = {
      id: 'job-fail-1',
      name: 'VirusScanWorker',
      data: { uploadId: 'upl-fail', collegeId, fileKey: 'photos/calc.webp' },
      attemptsMade: 3,
      maxAttempts: 3
    };

    await expect(failingWorker.process(job)).rejects.toThrow('Storage service unavailable');

    const dlq = dlqManager.getDLQEntries();
    expect(dlq.length).toBe(1);
    expect(dlq[0].jobId).toBe('job-fail-1');
  });
});
