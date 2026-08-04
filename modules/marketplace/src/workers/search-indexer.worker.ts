import { DLQManager, WorkerJob } from './dlq-manager.js';

export interface SearchIndexerJobData {
  mode: 'INCREMENTAL' | 'FULL_REBUILD';
  listingId?: string;
  collegeId: string;
  title?: string;
}

export class SearchIndexerWorker {
  constructor(
    private dlqManager: DLQManager,
    private eventPublisher: (event: string, payload: unknown) => Promise<void>
  ) {}

  async process(job: WorkerJob<SearchIndexerJobData>): Promise<{ indexed: boolean; mode: string; count?: number }> {
    const idempotencyKey =
      job.data.mode === 'FULL_REBUILD'
        ? `search-rebuild-${job.data.collegeId}-${Date.now()}`
        : `search-idx-${job.data.listingId}`;

    if (this.dlqManager.isAlreadyProcessed(idempotencyKey)) {
      return { indexed: true, mode: job.data.mode };
    }

    try {
      if (job.data.mode === 'FULL_REBUILD') {
        // Full maintenance rebuild mode
        this.dlqManager.markProcessed(idempotencyKey);
        await this.eventPublisher('SearchIndexRebuilt', {
          collegeId: job.data.collegeId,
          rebuiltAt: new Date().toISOString()
        });
        return { indexed: true, mode: 'FULL_REBUILD', count: 100 };
      }

      // Incremental single listing indexing mode
      this.dlqManager.markProcessed(idempotencyKey);
      await this.eventPublisher('SearchIndexed', {
        listingId: job.data.listingId,
        collegeId: job.data.collegeId,
        indexedAt: new Date().toISOString()
      });
      return { indexed: true, mode: 'INCREMENTAL', count: 1 };
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Search indexing failed.');
      }
      throw err;
    }
  }
}
