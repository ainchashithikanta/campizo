import { VirusScanWorker } from './virus-scan.worker.js';
import { ImageOptimizationWorker } from './image-optimization.worker.js';
import { MetadataExtractionWorker } from './metadata-extraction.worker.js';
import { SearchIndexerWorker } from './search-indexer.worker.js';
import { StatisticsWorker } from './statistics.worker.js';
import { ReservationExpiryWorker } from './reservation-expiry.worker.js';
import { ModerationWorker } from './moderation.worker.js';
import { NotificationWorker } from './notification.worker.js';
import { DLQManager } from './dlq-manager.js';
import { withJobMetrics, observability } from '@college-hub/observability';

export class MarketplaceEventRouter {
  constructor(
    private virusScanWorker: VirusScanWorker,
    private imageOptimWorker: ImageOptimizationWorker,
    private metadataWorker: MetadataExtractionWorker,
    private searchWorker: SearchIndexerWorker,
    private statsWorker: StatisticsWorker,
    private reservationExpiryWorker: ReservationExpiryWorker,
    private moderationWorker: ModerationWorker,
    private notificationWorker: NotificationWorker,
    private dlqManager: DLQManager
  ) {}

  async handleEvent(eventType: string, payload: any): Promise<void> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    await withJobMetrics(`marketplace-router.${eventType}`, observability.jobs, () =>
      this.routeEvent(eventType, payload, jobId)
    );
  }

  private async routeEvent(eventType: string, payload: any, jobId: string): Promise<void> {
    switch (eventType) {
      case 'UploadCompleted':
        // 1. Virus scan is the ONLY blocking worker
        await this.virusScanWorker.process({
          id: jobId,
          name: 'VirusScanWorker',
          data: payload,
          attemptsMade: 1,
          maxAttempts: 3
        });
        break;

      case 'VirusScanCompleted':
        // 2. Parallel fan-out: Image optimization & Metadata extraction run concurrently
        await Promise.all([
          this.imageOptimWorker.process({
            id: `img-${jobId}`,
            name: 'ImageOptimizationWorker',
            data: payload,
            attemptsMade: 1,
            maxAttempts: 3
          }),
          this.metadataWorker.process({
            id: `meta-${jobId}`,
            name: 'MetadataExtractionWorker',
            data: payload,
            attemptsMade: 1,
            maxAttempts: 3
          })
        ]);
        break;

      case 'ListingPublished':
        await this.searchWorker.process({
          id: jobId,
          name: 'SearchIndexerWorker',
          data: { ...payload, mode: 'INCREMENTAL' },
          attemptsMade: 1,
          maxAttempts: 5
        });
        break;

      case 'ListingViewed':
        await this.statsWorker.process({
          id: jobId,
          name: 'StatisticsWorker',
          data: { listingId: payload.listingId, collegeId: payload.collegeId, eventType: 'VIEW' },
          attemptsMade: 1,
          maxAttempts: 3
        });
        break;

      case 'BookmarkAdded':
        await this.statsWorker.process({
          id: jobId,
          name: 'StatisticsWorker',
          data: { listingId: payload.listingId, collegeId: payload.collegeId, eventType: 'BOOKMARK_ADD' },
          attemptsMade: 1,
          maxAttempts: 3
        });
        break;

      case 'OfferCreated':
        await this.statsWorker.process({
          id: jobId,
          name: 'StatisticsWorker',
          data: { listingId: payload.listingId, collegeId: payload.collegeId, eventType: 'OFFER' },
          attemptsMade: 1,
          maxAttempts: 3
        });
        await this.notificationWorker.process({
          id: `notif-${jobId}`,
          name: 'NotificationWorker',
          data: {
            collegeId: payload.collegeId,
            recipientUserId: payload.sellerUserId,
            type: 'OFFER_RECEIVED',
            payload
          },
          attemptsMade: 1,
          maxAttempts: 3
        });
        break;

      case 'ReservationCreated':
        await this.reservationExpiryWorker.process({
          id: jobId,
          name: 'ReservationExpiryWorker',
          data: payload,
          attemptsMade: 1,
          maxAttempts: 5
        });
        break;

      case 'ListingReported':
        await this.moderationWorker.process({
          id: jobId,
          name: 'ModerationWorker',
          data: payload,
          attemptsMade: 1,
          maxAttempts: 3
        });
        break;

      default:
        break;
    }
  }
}
