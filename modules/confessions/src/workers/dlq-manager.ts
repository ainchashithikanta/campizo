/**
 * Dead Letter Queue Manager & Worker Observability Metrics
 *
 * Provides exponential backoff retry, poison message detection,
 * idempotent processing guards, and worker performance metrics.
 */

export interface DlqEntry {
  eventId: string;
  eventType: string;
  workerName: string;
  payload: Record<string, unknown>;
  attempt: number;
  maxAttempts: number;
  lastError: string;
  firstFailedAt: string;
  lastFailedAt: string;
  requestId: string;
  isPoisonMessage: boolean;
}

export interface DlqManagerOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  poisonThreshold?: number;
}

export interface WorkerObservabilityMetrics {
  totalDispatched: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  dlqCount: number;
  successRate: number; // percentage 0 - 100
  avgExecutionDurationMs: number;
  avgQueueWaitTimeMs: number;
}

export class DlqManager {
  private deadLetters: DlqEntry[] = [];
  private processedIds = new Set<string>();
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly poisonThreshold: number;

  // Observability Counters
  private totalDispatched = 0;
  private successCount = 0;
  private failureCount = 0;
  private retryCount = 0;
  private totalExecutionDurationMs = 0;
  private totalQueueWaitTimeMs = 0;

  constructor(opts: DlqManagerOptions = {}) {
    this.maxAttempts = opts.maxAttempts ?? 5;
    this.baseDelayMs = opts.baseDelayMs ?? 1000;
    this.maxDelayMs = opts.maxDelayMs ?? 30000;
    this.poisonThreshold = opts.poisonThreshold ?? 3;
  }

  /**
   * Record worker execution performance.
   */
  recordExecution(durationMs: number, queueWaitMs: number = 0, success: boolean = true): void {
    this.totalDispatched += 1;
    this.totalExecutionDurationMs += durationMs;
    this.totalQueueWaitTimeMs += queueWaitMs;

    if (success) {
      this.successCount += 1;
    } else {
      this.failureCount += 1;
    }
  }

  /**
   * Calculate exponential backoff delay: base * 2^(attempt-1), capped at maxDelayMs.
   */
  calculateDelay(attempt: number): number {
    const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }

  /**
   * Idempotency guard — returns true if this eventId was already processed.
   */
  isAlreadyProcessed(eventId: string): boolean {
    return this.processedIds.has(eventId);
  }

  /**
   * Mark an event as successfully processed (idempotency record).
   */
  markProcessed(eventId: string): void {
    this.processedIds.add(eventId);
  }

  /**
   * Record a failed processing attempt.
   */
  recordFailure(params: {
    eventId: string;
    eventType: string;
    workerName: string;
    payload: Record<string, unknown>;
    attempt: number;
    error: string;
    requestId: string;
  }): DlqEntry {
    const now = new Date().toISOString();
    if (params.attempt > 1) {
      this.retryCount += 1;
    }

    const existing = this.deadLetters.find((d) => d.eventId === params.eventId && d.workerName === params.workerName);

    if (existing) {
      existing.attempt = params.attempt;
      existing.lastError = params.error;
      existing.lastFailedAt = now;
      existing.isPoisonMessage = params.attempt >= this.poisonThreshold;
      return existing;
    }

    const entry: DlqEntry = {
      eventId: params.eventId,
      eventType: params.eventType,
      workerName: params.workerName,
      payload: params.payload,
      attempt: params.attempt,
      maxAttempts: this.maxAttempts,
      lastError: params.error,
      firstFailedAt: now,
      lastFailedAt: now,
      requestId: params.requestId,
      isPoisonMessage: params.attempt >= this.poisonThreshold
    };

    this.deadLetters.push(entry);
    return entry;
  }

  /**
   * Check if a message should be retried.
   */
  shouldRetry(eventId: string, workerName: string): boolean {
    const entry = this.deadLetters.find((d) => d.eventId === eventId && d.workerName === workerName);
    if (!entry) return true;
    return entry.attempt < this.maxAttempts && !entry.isPoisonMessage;
  }

  /**
   * Get worker observability metrics snapshot.
   */
  getMetrics(): WorkerObservabilityMetrics {
    const total = this.totalDispatched || 1;
    return {
      totalDispatched: this.totalDispatched,
      successCount: this.successCount,
      failureCount: this.failureCount,
      retryCount: this.retryCount,
      dlqCount: this.deadLetters.length,
      successRate: Math.round((this.successCount / total) * 100),
      avgExecutionDurationMs: Math.round(this.totalExecutionDurationMs / total),
      avgQueueWaitTimeMs: Math.round(this.totalQueueWaitTimeMs / total)
    };
  }

  /**
   * Get all dead letter entries.
   */
  getDeadLetters(): DlqEntry[] {
    return [...this.deadLetters];
  }

  /**
   * Get poison messages only.
   */
  getPoisonMessages(): DlqEntry[] {
    return this.deadLetters.filter((d) => d.isPoisonMessage);
  }

  /**
   * Clear processed IDs.
   */
  clearProcessedIds(): void {
    this.processedIds.clear();
  }
}
