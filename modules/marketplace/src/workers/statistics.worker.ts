import { MarketplaceStatisticsRepository } from '../domain/repository.interface.js';
import { DLQManager, WorkerJob } from './dlq-manager.js';

export interface StatisticsJobData {
  listingId: string;
  collegeId: string;
  eventType: 'VIEW' | 'BOOKMARK_ADD' | 'BOOKMARK_REMOVE' | 'OFFER' | 'SOLD';
}

export class StatisticsWorker {
  constructor(
    private statsRepo: MarketplaceStatisticsRepository,
    private dlqManager: DLQManager,
    private eventPublisher: (event: string, payload: unknown) => Promise<void>
  ) {}

  async process(job: WorkerJob<StatisticsJobData>): Promise<void> {
    try {
      const { listingId, collegeId, eventType } = job.data;
      let stats = await this.statsRepo.findByListing(listingId, collegeId);

      if (!stats) {
        stats = {
          listingId,
          collegeId,
          totalViews: 0,
          totalBookmarks: 0,
          totalOffers: 0,
          popularityScore: 0
        };
      }

      if (eventType === 'VIEW') stats.totalViews += 1;
      if (eventType === 'BOOKMARK_ADD') stats.totalBookmarks += 1;
      if (eventType === 'BOOKMARK_REMOVE') stats.totalBookmarks = Math.max(0, stats.totalBookmarks - 1);
      if (eventType === 'OFFER') stats.totalOffers += 1;

      // Popularity score formula: views + 3*bookmarks + 5*offers
      stats.popularityScore = stats.totalViews + stats.totalBookmarks * 3 + stats.totalOffers * 5;
      stats.lastCalculatedAt = new Date();

      await this.statsRepo.save(stats);
      await this.eventPublisher('StatisticsUpdated', { listingId, collegeId, stats });
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Statistics aggregation failed.');
      }
      throw err;
    }
  }
}
