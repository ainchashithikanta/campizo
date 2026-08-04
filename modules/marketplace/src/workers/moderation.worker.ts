import { ReportRepository, MarketplaceListingRepository } from '../domain/repository.interface.js';
import { DLQManager, WorkerJob } from './dlq-manager.js';

export interface ModerationJobData {
  listingId: string;
  collegeId: string;
}

export class ModerationWorker {
  constructor(
    private reportRepo: ReportRepository,
    private listingRepo: MarketplaceListingRepository,
    private dlqManager: DLQManager,
    private eventPublisher: (event: string, payload: unknown) => Promise<void>
  ) {}

  async process(job: WorkerJob<ModerationJobData>): Promise<void> {
    try {
      const { listingId, collegeId } = job.data;
      const count = await this.reportRepo.countByListing(listingId, collegeId);

      if (count >= 3) {
        const listing = await this.listingRepo.findById(listingId, collegeId);
        if (listing && listing.status === 'PUBLISHED') {
          listing.status = 'QUARANTINED';
          listing.updatedAt = new Date();
          await this.listingRepo.save(listing);

          await this.eventPublisher('ListingQuarantined', {
            listingId,
            collegeId,
            totalReports: count,
            quarantinedAt: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Moderation quarantine processing failed.');
      }
      throw err;
    }
  }
}
