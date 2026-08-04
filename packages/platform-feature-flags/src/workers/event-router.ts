/**
 * Centralized Platform Event Router & Event Registry
 * Routes domain events to registered worker handlers with idempotency guards.
 */

import { PlatformFeatureFlagDomainEvent } from '../domain/events.js';
import { DLQManager } from './dlq-manager.js';

export interface EnvelopeDomainEvent {
  event: PlatformFeatureFlagDomainEvent;
  requestId: string;
  traceId: string;
  configurationVersion: number;
}

export type EventWorkerHandler = (envelope: EnvelopeDomainEvent) => Promise<void>;

export class EventRouter {
  private readonly handlerRegistry: Map<string, EventWorkerHandler[]> = new Map();

  constructor(private readonly dlqManager: DLQManager) {}

  /**
   * Registers a worker handler for a specific event type.
   * Execution complexity: O(1).
   */
  registerHandler(eventType: string, handler: EventWorkerHandler): void {
    const existing = this.handlerRegistry.get(eventType) || [];
    existing.push(handler);
    this.handlerRegistry.set(eventType, existing);
  }

  /**
   * Routes an incoming domain event to all registered worker handlers with idempotency checking.
   * Execution complexity: O(H) where H is handler count.
   */
  async routeEvent(
    event: PlatformFeatureFlagDomainEvent,
    requestId?: string,
    traceId?: string,
    configurationVersion?: number
  ): Promise<void> {
    const eventId = event.eventId;
    if (this.dlqManager.isProcessed(eventId)) {
      return; // Idempotency Guard: skip duplicate events
    }

    const envelope: EnvelopeDomainEvent = {
      event,
      requestId: requestId || `req_${Date.now()}`,
      traceId: traceId || `trace_${Date.now()}`,
      configurationVersion: configurationVersion ?? 1
    };

    const handlers = this.handlerRegistry.get(event.eventType) || [];
    for (const handler of handlers) {
      let attempt = 1;
      let success = false;

      while (!success && attempt <= 3) {
        try {
          await handler(envelope);
          success = true;
        } catch (err) {
          const { routedToDLQ } = this.dlqManager.handleFailure({
            eventId,
            workerName: handler.name || 'AnonymousWorker',
            requestId: envelope.requestId,
            traceId: envelope.traceId,
            payload: event,
            attemptCount: attempt,
            errorReason: err instanceof Error ? err.message : String(err)
          });

          if (routedToDLQ) {
            break;
          }
          attempt++;
        }
      }
    }

    this.dlqManager.markProcessed(eventId);
  }
}
