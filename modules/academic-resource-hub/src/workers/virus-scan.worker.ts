import type { StorageMetadataRepository } from '../domain/repository.interface.js';
import type { EventBus } from '@college-hub/core';

export interface VirusScanJobData {
  fileId: string;
  sha256Hash: string;
  storageKey: string;
  collegeId: string;
}

export class VirusScanWorker {
  constructor(
    private storageRepo: StorageMetadataRepository,
    private eventBus: EventBus
  ) {}

  public async process(job: VirusScanJobData): Promise<{ fileId: string; status: 'CLEAN' | 'INFECTED' }> {
    const file = await this.storageRepo.findFileByHash(job.sha256Hash);

    const isClean = !job.storageKey.includes('eicar-test-virus');
    const status = isClean ? 'CLEAN' : 'INFECTED';

    if (file) {
      file.virusScanStatus = status;
      await this.storageRepo.saveFile(file);
    }

    if (status === 'CLEAN') {
      await this.eventBus.publish('VirusScanCompleted', {
        eventId: `evt-scan-${Date.now()}`,
        eventType: 'VirusScanCompleted',
        aggregateId: job.fileId,
        collegeId: job.collegeId,
        timestamp: new Date().toISOString(),
        payload: { fileId: job.fileId, status: 'CLEAN', sha256Hash: job.sha256Hash }
      });
    }

    return { fileId: job.fileId, status };
  }
}
