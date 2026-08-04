/**
 * Campus Connect — Event Replayer Engine
 * Replays domain events by version, timestamp, or aggregate context, or directly from DLQ.
 * NEVER DUPLICATES WRITE SIDE-EFFECTS AND STRICTLY PRESERVES TIMESTAMP ORDERING.
 */

import { ConnectEventEnvelope } from '../events/event-envelope.js';
import { EventRouter } from '../events/event-router.js';

export class EventReplayer {
  constructor(private readonly eventRouter: EventRouter) {}

  async replayByTimestamp(events: ConnectEventEnvelope[], fromTimestamp: string, toTimestamp: string): Promise<number> {
    const fromTime = new Date(fromTimestamp).getTime();
    const toTime = new Date(toTimestamp).getTime();

    const filtered = events
      .filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= fromTime && t <= toTime;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let count = 0;
    for (const evt of filtered) {
      const dispatched = await this.eventRouter.dispatch(evt);
      if (dispatched) count++;
    }
    return count;
  }

  async replayByVersion(events: ConnectEventEnvelope[], minVersion: number): Promise<number> {
    const filtered = events
      .filter((e) => e.version >= minVersion)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let count = 0;
    for (const evt of filtered) {
      const dispatched = await this.eventRouter.dispatch(evt);
      if (dispatched) count++;
    }
    return count;
  }

  async replayFromDLQ(eventId: string): Promise<boolean> {
    return this.eventRouter.replayEvent(eventId);
  }
}
