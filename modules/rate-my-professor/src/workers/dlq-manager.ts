import { logger } from '@college-hub/logger';

export interface DLQItem<T = any> {
  id: string;
  eventId: string;
  eventName: string;
  collegeId: string;
  payload: T;
  error: string;
  attempts: number;
  failedAt: Date;
}

export class DeadLetterQueueManager {
  private dlq = new Map<string, DLQItem>();
  private processedEventIds = new Set<string>();
  private totalSucceeded = 0;
  private totalFailed = 0;

  public isProcessed(eventId: string): boolean {
    return this.processedEventIds.has(eventId);
  }

  public markProcessed(eventId: string): void {
    this.processedEventIds.add(eventId);
    this.totalSucceeded += 1;
  }

  public async executeWithRetry<T>(
    eventId: string,
    eventName: string,
    collegeId: string,
    payload: T,
    fn: () => Promise<void>,
    maxRetries = 3
  ): Promise<boolean> {
    if (this.isProcessed(eventId)) {
      logger.info({ eventId, eventName, collegeId }, 'Event already processed (idempotency check passed). Skipping.');
      return true;
    }

    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        await fn();
        this.markProcessed(eventId);
        logger.info({ eventId, eventName, collegeId, attempt }, 'Async event worker execution succeeded');
        return true;
      } catch (err: any) {
        lastError = err;
        logger.warn(
          { eventId, eventName, collegeId, attempt, maxRetries, error: err.message },
          'Worker execution attempt failed, retrying with backoff...'
        );
        if (attempt < maxRetries) {
          // Exponential backoff: 20ms * 2^(attempt - 1)
          const delay = 20 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed -> Send to DLQ
    this.totalFailed += 1;
    const dlqItem: DLQItem<T> = {
      id: `dlq-${eventId}`,
      eventId,
      eventName,
      collegeId,
      payload,
      error: lastError?.message || 'Unknown error',
      attempts: attempt,
      failedAt: new Date()
    };

    this.dlq.set(dlqItem.id, dlqItem);
    logger.error(
      { dlqId: dlqItem.id, eventId, eventName, collegeId, attempts: attempt, error: dlqItem.error },
      '🚨 Event worker exhausted all retries! Moved to Dead Letter Queue (DLQ).'
    );
    return false;
  }

  public getDLQItems(): DLQItem[] {
    return Array.from(this.dlq.values());
  }

  public getMetrics() {
    return {
      totalSucceeded: this.totalSucceeded,
      totalFailed: this.totalFailed,
      dlqCount: this.dlq.size
    };
  }

  public clear(): void {
    this.dlq.clear();
    this.processedEventIds.clear();
    this.totalSucceeded = 0;
    this.totalFailed = 0;
  }
}
