import { EventEmitter } from 'node:events';
import { logger } from '@college-hub/logger';

export interface EventBus {
  publish<T = unknown>(topic: string, payload: T): Promise<void>;
  subscribe<T = unknown>(topic: string, handler: (payload: T) => Promise<void> | void): void;
  unsubscribe<T = unknown>(topic: string, handler: (payload: T) => Promise<void> | void): void;
}

export class InMemoryEventBus implements EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  public async publish<T = unknown>(topic: string, payload: T): Promise<void> {
    logger.debug({ topic, payload }, `[EventBus] Publishing event on topic '${topic}'`);
    this.emitter.emit(topic, payload);
  }

  public subscribe<T = unknown>(topic: string, handler: (payload: T) => Promise<void> | void): void {
    const wrappedHandler = async (payload: T) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error({ topic, error }, `[EventBus] Exception in subscriber handler for topic '${topic}'`);
      }
    };
    this.emitter.on(topic, wrappedHandler);
  }

  public unsubscribe<T = unknown>(topic: string, handler: (payload: T) => Promise<void> | void): void {
    this.emitter.removeListener(topic, handler as any);
  }
}
