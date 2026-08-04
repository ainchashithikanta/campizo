import { DLQManager, WorkerJob } from './dlq-manager.js';

export interface VirusScanJobData {
  uploadId: string;
  collegeId: string;
  fileKey: string;
  sha256Hash?: string;
}

export interface VirusScanResult {
  uploadId: string;
  collegeId: string;
  fileKey: string;
  virusScanStatus: 'CLEAN' | 'INFECTED';
  scannedAt: string;
}

export class VirusScanWorker {
  constructor(
    private dlqManager: DLQManager,
    private eventPublisher: (event: string, payload: unknown) => Promise<void>
  ) {}

  async process(job: WorkerJob<VirusScanJobData>): Promise<VirusScanResult> {
    const idempotencyKey = `scan-${job.data.uploadId}`;
    if (this.dlqManager.isAlreadyProcessed(idempotencyKey)) {
      return {
        uploadId: job.data.uploadId,
        collegeId: job.data.collegeId,
        fileKey: job.data.fileKey,
        virusScanStatus: 'CLEAN',
        scannedAt: new Date().toISOString()
      };
    }

    try {
      // Simulate binary virus scan check
      const isInfected = job.data.fileKey.includes('EICAR_TEST_VIRUS');
      const scanStatus = isInfected ? 'INFECTED' : 'CLEAN';

      const result: VirusScanResult = {
        uploadId: job.data.uploadId,
        collegeId: job.data.collegeId,
        fileKey: job.data.fileKey,
        virusScanStatus: scanStatus,
        scannedAt: new Date().toISOString()
      };

      this.dlqManager.markProcessed(idempotencyKey);

      if (scanStatus === 'CLEAN') {
        await this.eventPublisher('VirusScanCompleted', result);
      } else {
        await this.eventPublisher('VirusScanFailed', result);
      }

      return result;
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Virus scan processing failed.');
      }
      throw err;
    }
  }
}
