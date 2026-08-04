/**
 * Campus Connect — Centralized Event Router
 * Routes incoming event envelopes to background worker subscribers with duplicate event protection,
 * strict event envelope validation, retry handling, DLQ routing, and replay support.
 */

import { ConnectEventEnvelope, validateEventEnvelope } from './event-envelope.js';
import { DLQManager } from './dlq-manager.js';
import { RetryPolicy } from './retry-policy.js';

export type EventHandler<T = any> = (event: ConnectEventEnvelope<T>) => Promise<void>;

export class EventRouter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private processedEventIds: Set<string> = new Set();
  public readonly dlqManager: DLQManager;
  private readonly retryPolicy: RetryPolicy;

  constructor(dlqManager?: DLQManager, retryPolicy?: RetryPolicy) {
    this.dlqManager = dlqManager || new DLQManager();
    this.retryPolicy = retryPolicy || new RetryPolicy();
  }

  subscribe<T = any>(eventType: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  async dispatch(rawEvent: unknown): Promise<boolean> {
    const event = validateEventEnvelope(rawEvent);

    // Duplicate Event Protection (Idempotency)
    if (this.processedEventIds.has(event.eventId)) {
      return false; // Idempotently skip duplicate execution
    }

    const handlers = this.handlers.get(event.eventType) || [];
    if (handlers.length === 0) {
      this.processedEventIds.add(event.eventId);
      return true;
    }

    for (const handler of handlers) {
      let attempt = 0;
      let success = false;
      let lastError: Error | undefined;

      while (!success && attempt < 3) {
        attempt++;
        try {
          await handler(event);
          success = true;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < 3 && this.retryPolicy.shouldRetry(attempt)) {
            // Backoff delay
            await new Promise((res) => setTimeout(res, 10));
          }
        }
      }

      if (!success && lastError) {
        this.dlqManager.recordPoisonMessage(event, attempt, lastError, handler.name || 'AnonymousHandler');
      }
    }

    this.processedEventIds.add(event.eventId);
    return true;
  }

  async replayEvent(eventId: string): Promise<boolean> {
    const poisonEntry = this.dlqManager.getPoisonMessageById(eventId);
    if (!poisonEntry) {
      throw new Error(`Poison event '${eventId}' not found in DLQ.`);
    }

    this.processedEventIds.delete(eventId);
    this.dlqManager.removePoisonMessage(eventId);
    return this.dispatch(poisonEntry.event);
  }

  clearProcessedEvents(): void {
    this.processedEventIds.clear();
  }

  getProcessedEventCount(): number {
    return this.processedEventIds.size;
  }
}
