import { ReservationRepository, MarketplaceListingRepository } from '../domain/repository.interface.js';
import { DLQManager, WorkerJob } from './dlq-manager.js';

export interface ReservationExpiryJobData {
  reservationId: string;
  listingId: string;
  collegeId: string;
}

export class ReservationExpiryWorker {
  constructor(
    private reservationRepo: ReservationRepository,
    private listingRepo: MarketplaceListingRepository,
    private dlqManager: DLQManager,
    private eventPublisher: (event: string, payload: unknown) => Promise<void>
  ) {}

  async process(job: WorkerJob<ReservationExpiryJobData>): Promise<void> {
    const idempotencyKey = `res-exp-${job.data.reservationId}`;
    if (this.dlqManager.isAlreadyProcessed(idempotencyKey)) {
      return;
    }

    try {
      const res = await this.reservationRepo.findById(job.data.reservationId, job.data.collegeId);
      if (res && res.status === 'ACTIVE') {
        res.status = 'EXPIRED';
        await this.reservationRepo.save(res);

        const listing = await this.listingRepo.findById(job.data.listingId, job.data.collegeId);
        if (listing && listing.status === 'RESERVED') {
          listing.status = 'PUBLISHED';
          listing.currentReservationId = null;
          await this.listingRepo.save(listing);
        }

        this.dlqManager.markProcessed(idempotencyKey);
        await this.eventPublisher('ReservationExpired', {
          reservationId: res.id,
          listingId: job.data.listingId,
          collegeId: job.data.collegeId
        });
      }
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Reservation expiry failed.');
      }
      throw err;
    }
  }
}
