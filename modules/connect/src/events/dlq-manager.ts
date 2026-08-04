/**
 * Campus Connect — Dead Letter Queue (DLQ) Manager & Poison Message Detector
 * Captures failed event processing attempts beyond max retries and enables replay capability.
 */

import { ConnectEventEnvelope } from './event-envelope.js';

export interface PoisonMessageEntry {
  event: ConnectEventEnvelope;
  failedAttempts: number;
  lastError: string;
  failedAt: string;
  handlerName: string;
}

export class DLQManager {
  private dlqStore: Map<string, PoisonMessageEntry> = new Map();

  recordPoisonMessage(event: ConnectEventEnvelope, attempts: number, error: Error | string, handlerName: string): void {
    const errorMsg = typeof error === 'string' ? error : error.message;
    this.dlqStore.set(event.eventId, {
      event,
      failedAttempts: attempts,
      lastError: errorMsg,
      failedAt: new Date().toISOString(),
      handlerName
    });
  }

  getPoisonMessages(): PoisonMessageEntry[] {
    return Array.from(this.dlqStore.values());
  }

  getPoisonMessageById(eventId: string): PoisonMessageEntry | undefined {
    return this.dlqStore.get(eventId);
  }

  removePoisonMessage(eventId: string): boolean {
    return this.dlqStore.delete(eventId);
  }

  clear(): void {
    this.dlqStore.clear();
  }
}
