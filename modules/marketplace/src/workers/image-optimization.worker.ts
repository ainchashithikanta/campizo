import { DLQManager, WorkerJob } from './dlq-manager.js';

export interface ImageOptimizationJobData {
  uploadId: string;
  collegeId: string;
  fileKey: string;
}

export interface ImageOptimizationResult {
  uploadId: string;
  collegeId: string;
  originalKey: string;
  variants: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
  processedAt: string;
}

export class ImageOptimizationWorker {
  constructor(
    private dlqManager: DLQManager,
    private eventPublisher: (event: string, payload: unknown) => Promise<void>
  ) {}

  async process(job: WorkerJob<ImageOptimizationJobData>): Promise<ImageOptimizationResult> {
    const idempotencyKey = `img-opt-${job.data.uploadId}`;
    if (this.dlqManager.isAlreadyProcessed(idempotencyKey)) {
      return {
        uploadId: job.data.uploadId,
        collegeId: job.data.collegeId,
        originalKey: job.data.fileKey,
        variants: {
          thumbnail: `${job.data.fileKey}_thumb.webp`,
          small: `${job.data.fileKey}_sm.webp`,
          medium: `${job.data.fileKey}_md.webp`,
          large: `${job.data.fileKey}_lg.webp`
        },
        processedAt: new Date().toISOString()
      };
    }

    try {
      const result: ImageOptimizationResult = {
        uploadId: job.data.uploadId,
        collegeId: job.data.collegeId,
        originalKey: job.data.fileKey,
        variants: {
          thumbnail: `${job.data.fileKey}_thumb.webp`,
          small: `${job.data.fileKey}_sm.webp`,
          medium: `${job.data.fileKey}_md.webp`,
          large: `${job.data.fileKey}_lg.webp`
        },
        processedAt: new Date().toISOString()
      };

      this.dlqManager.markProcessed(idempotencyKey);
      await this.eventPublisher('ImageOptimizationCompleted', result);
      return result;
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Image optimization failed.');
      }
      throw err;
    }
  }
}
