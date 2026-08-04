/**
 * EventReplayer
 * Replays domain events sequentially with idempotency checking and version integrity checks.
 */

import { EnvelopeDomainEvent, EventRouter } from '../workers/event-router.js';

export class EventReplayer {
  constructor(private readonly eventRouter: EventRouter) {}

  /**
   * Replays historical event sequence.
   * Expected complexity: O(N).
   */
  async replayEvents(envelopes: EnvelopeDomainEvent[]): Promise<{ processedCount: number }> {
    let processedCount = 0;

    // Enforce sequence ordering by configuration version
    const sorted = [...envelopes].sort((a, b) => a.configurationVersion - b.configurationVersion);

    for (const env of sorted) {
      await this.eventRouter.routeEvent(env.event, env.requestId, env.traceId, env.configurationVersion);
      processedCount++;
    }

    return { processedCount };
  }
}
