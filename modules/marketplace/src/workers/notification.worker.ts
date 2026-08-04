import { DLQManager, WorkerJob } from './dlq-manager.js';

export interface NotificationJobData {
  collegeId: string;
  recipientUserId: string;
  type:
    'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'RESERVATION_CREATED' | 'RESERVATION_EXPIRED' | 'ITEM_SOLD' | 'NEW_MESSAGE';
  payload: Record<string, unknown>;
}

export class NotificationWorker {
  public preparedNotifications: NotificationJobData[] = [];

  constructor(private dlqManager: DLQManager) {}

  async process(job: WorkerJob<NotificationJobData>): Promise<void> {
    try {
      this.preparedNotifications.push(job.data);
    } catch (err: any) {
      if (job.attemptsMade >= job.maxAttempts) {
        this.dlqManager.pushToDLQ(job, err.message || 'Notification preparation failed.');
      }
      throw err;
    }
  }
}
