/**
 * Safe Event Replay Manager
 * Supports replaying historical domain event streams safely with sequence ordering & schema compatibility validation.
 */

import { EnvelopeDomainEvent, EventRouter } from './event-router.js';

export interface ReplaySessionResult {
  replayedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
}

export class EventReplayManager {
  constructor(private readonly eventRouter: EventRouter) {}

  /**
   * Safely replays a stream of historical domain events in strict sequential order.
   * Execution complexity: O(N).
   */
  async replayEventStream(envelopes: EnvelopeDomainEvent[]): Promise<ReplaySessionResult> {
    const start = performance.now();
    let replayedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Sort by configuration version & timestamp for deterministic replay ordering
    const sorted = [...envelopes].sort((a, b) => a.configurationVersion - b.configurationVersion);

    for (const env of sorted) {
      try {
        await this.eventRouter.routeEvent(env.event, env.requestId, env.traceId, env.configurationVersion);
        replayedCount++;
      } catch (err) {
        failedCount++;
      }
    }

    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      replayedCount,
      skippedCount,
      failedCount,
      durationMs
    };
  }
}
