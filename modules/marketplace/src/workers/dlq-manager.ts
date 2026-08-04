export interface WorkerJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
  maxAttempts: number;
}

export interface DLQEntry<T = unknown> {
  jobId: string;
  workerName: string;
  payload: T;
  failedReason: string;
  failedAt: string;
  attemptsMade: number;
}

export class DLQManager {
  private deadLetters: DLQEntry[] = [];
  private processedJobIds = new Set<string>();

  public isAlreadyProcessed(idempotencyKey: string): boolean {
    return this.processedJobIds.has(idempotencyKey);
  }

  public markProcessed(idempotencyKey: string): void {
    this.processedJobIds.add(idempotencyKey);
  }

  public computeBackoffDelay(attempt: number, baseMs: number = 1000): number {
    return Math.min(baseMs * Math.pow(2, attempt - 1), 30000);
  }

  public pushToDLQ<T>(job: WorkerJob<T>, reason: string): DLQEntry<T> {
    const entry: DLQEntry<T> = {
      jobId: job.id,
      workerName: job.name,
      payload: job.data,
      failedReason: reason,
      failedAt: new Date().toISOString(),
      attemptsMade: job.attemptsMade
    };
    this.deadLetters.push(entry as DLQEntry);
    return entry;
  }

  public getDLQEntries(): DLQEntry[] {
    return [...this.deadLetters];
  }

  public clearDLQ(): void {
    this.deadLetters = [];
  }
}
