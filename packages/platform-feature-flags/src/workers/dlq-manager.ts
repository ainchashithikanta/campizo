/**
 * Dead-Letter Queue (DLQ) Manager & Poison Message Detector
 * Manages async task retries with exponential backoff, poison message detection, and worker metrics.
 */

export interface PoisonMessage {
  eventId: string;
  workerName: string;
  requestId: string;
  traceId: string;
  payload: unknown;
  attemptCount: number;
  firstFailureTimestamp: string;
  lastFailureTimestamp: string;
  lastErrorReason: string;
}

export class DLQManager {
  private readonly deadLetterQueue: Map<string, PoisonMessage> = new Map();
  private readonly processedMessageIds: Set<string> = new Set();
  private readonly maxRetries: number = 3;

  /**
   * Idempotency Check: Returns true if event has already been processed successfully.
   * Execution complexity: O(1).
   */
  isProcessed(eventId: string): boolean {
    return this.processedMessageIds.has(eventId);
  }

  /**
   * Records successful message processing for idempotency protection.
   * Execution complexity: O(1).
   */
  markProcessed(eventId: string): void {
    this.processedMessageIds.add(eventId);
  }

  /**
   * Handles task execution failures and manages DLQ routing.
   * Execution complexity: O(1).
   */
  handleFailure(params: {
    eventId: string;
    workerName: string;
    requestId: string;
    traceId: string;
    payload: unknown;
    attemptCount: number;
    errorReason: string;
  }): { routedToDLQ: boolean; retryBackoffMs: number } {
    const { eventId, workerName, requestId, traceId, payload, attemptCount, errorReason } = params;
    const now = new Date().toISOString();

    if (attemptCount >= this.maxRetries) {
      const existing = this.deadLetterQueue.get(eventId);
      const poisonMsg: PoisonMessage = {
        eventId,
        workerName,
        requestId,
        traceId,
        payload,
        attemptCount,
        firstFailureTimestamp: existing ? existing.firstFailureTimestamp : now,
        lastFailureTimestamp: now,
        lastErrorReason: errorReason
      };
      this.deadLetterQueue.set(eventId, poisonMsg);
      return { routedToDLQ: true, retryBackoffMs: 0 };
    }

    // Exponential backoff: 50ms, 100ms, 200ms
    const retryBackoffMs = Math.pow(2, attemptCount) * 50;
    return { routedToDLQ: false, retryBackoffMs };
  }

  /**
   * Lists all poison messages currently stored in the Dead-Letter Queue.
   * Execution complexity: O(N).
   */
  getPoisonMessages(): PoisonMessage[] {
    return Array.from(this.deadLetterQueue.values());
  }

  /**
   * Replays a poison message from DLQ.
   */
  replayPoisonMessage(eventId: string): PoisonMessage | null {
    const msg = this.deadLetterQueue.get(eventId);
    if (msg) {
      this.deadLetterQueue.delete(eventId);
      return msg;
    }
    return null;
  }
}
