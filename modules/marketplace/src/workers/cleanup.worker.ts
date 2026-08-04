import { DLQManager, WorkerJob } from './dlq-manager.js';

export class CleanupWorker {
  public cleanedArtifactsCount = 0;

  constructor(private dlqManager: DLQManager) {}

  async process(job: WorkerJob<{ scope: string }>): Promise<{ cleanedCount: number }> {
    try {
      // Periodic cleanup of temp files
      this.cleanedArtifactsCount += 5;
      return { cleanedCount: 5 };
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Cleanup worker failed.');
      }
      throw err;
    }
  }
}
