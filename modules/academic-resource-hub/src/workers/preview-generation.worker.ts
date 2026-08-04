import type { StorageMetadataRepository } from '../domain/repository.interface.js';
import type { EventBus } from '@college-hub/core';

export interface PreviewGenerationJobData {
  fileId: string;
  sha256Hash: string;
  mimeType: string;
  collegeId: string;
}

export class PreviewGenerationWorker {
  constructor(
    private storageRepo: StorageMetadataRepository,
    private eventBus: EventBus
  ) {}

  public async process(
    job: PreviewGenerationJobData
  ): Promise<{ fileId: string; hasPreview: boolean; pageCount: number }> {
    const file = await this.storageRepo.findFileByHash(job.sha256Hash);

    const isPdf = job.mimeType === 'application/pdf';
    const pageCount = isPdf ? 12 : 1;
    const hasPreview = true;

    if (file) {
      file.hasPreview = hasPreview;
      file.pageCount = pageCount;
      await this.storageRepo.saveFile(file);
    }

    await this.eventBus.publish('PreviewGenerationCompleted', {
      eventId: `evt-prev-${Date.now()}`,
      eventType: 'PreviewGenerationCompleted',
      aggregateId: job.fileId,
      collegeId: job.collegeId,
      timestamp: new Date().toISOString(),
      payload: { fileId: job.fileId, hasPreview, pageCount }
    });

    return { fileId: job.fileId, hasPreview, pageCount };
  }
}
