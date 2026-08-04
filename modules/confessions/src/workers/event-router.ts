import type { EventPublisher } from '../use-cases/confession.use-cases.js';
import { DlqManager } from './dlq-manager.js';

export type WorkerHandler = (payload: Record<string, unknown>) => Promise<void>;

export interface WorkerRegistration {
  workerName: string;
  handler: WorkerHandler;
}

export interface EventRouterOptions {
  dlqManager: DlqManager;
  registry?: EventRegistry;
}

/**
 * EventRegistry — Maps domain event names to target worker lists.
 * Replaces hardcoded switch statements or monolithic dictionaries with a configurable registry.
 */
export class EventRegistry {
  private routes = new Map<string, Set<string>>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register('ConfessionCreated', ['PiiScanWorker']);
    this.register('ConfessionPublished', ['SearchIndexerWorker', 'RankingWorker', 'NotificationWorker']);
    this.register('VoteAdded', ['StatisticsWorker', 'RankingWorker']);
    this.register('VoteRemoved', ['StatisticsWorker', 'RankingWorker']);
    this.register('CommentAdded', ['StatisticsWorker', 'RankingWorker', 'NotificationWorker', 'SearchIndexerWorker']);
    this.register('CommentSoftDeleted', ['SearchIndexerWorker']);
    this.register('BookmarkAdded', ['StatisticsWorker']);
    this.register('BookmarkRemoved', ['StatisticsWorker']);
    this.register('ReportSubmitted', ['ModerationWorker', 'StatisticsWorker']);
    this.register('ModerationCaseOpened', ['NotificationWorker']);
    this.register('ModerationDecisionRecorded', ['SearchIndexerWorker', 'NotificationWorker', 'StatisticsWorker']);
    this.register('ConfessionArchived', ['SearchIndexerWorker', 'CleanupWorker']);
    this.register('ConfessionDeleted', ['SearchIndexerWorker', 'CleanupWorker']);
  }

  register(eventType: string, workers: string[]): void {
    const existing = this.routes.get(eventType) || new Set<string>();
    for (const w of workers) {
      existing.add(w);
    }
    this.routes.set(eventType, existing);
  }

  getWorkersForEvent(eventType: string): string[] {
    const set = this.routes.get(eventType);
    return set ? Array.from(set) : [];
  }
}

export class EventRouter implements EventPublisher {
  private workers = new Map<string, WorkerHandler>();
  private dlqManager: DlqManager;
  public registry: EventRegistry;
  public dispatchLog: Array<{ eventType: string; workerName: string; success: boolean }> = [];

  constructor(opts: EventRouterOptions) {
    this.dlqManager = opts.dlqManager;
    this.registry = opts.registry || new EventRegistry();
  }

  /**
   * Register a worker handler by name.
   */
  registerWorker(workerName: string, handler: WorkerHandler): void {
    this.workers.set(workerName, handler);
  }

  /**
   * Get target workers for an event type using the registry.
   */
  getRoutesForEvent(eventType: string): string[] {
    return this.registry.getWorkersForEvent(eventType);
  }

  /**
   * Publish a domain event, dispatching to all registered workers via EventRegistry.
   */
  async publish(eventType: string, payload: any): Promise<void> {
    const eventId = payload.eventId || `evt-${Date.now()}`;
    const requestId = payload.requestId || 'unknown';
    const routes = this.getRoutesForEvent(eventType);

    for (const workerName of routes) {
      const compositeKey = `${eventId}:${workerName}`;
      if (this.dlqManager.isAlreadyProcessed(compositeKey)) {
        this.dispatchLog.push({ eventType, workerName, success: true });
        continue;
      }

      const handler = this.workers.get(workerName);
      if (!handler) {
        this.dispatchLog.push({ eventType, workerName, success: false });
        continue;
      }

      try {
        await handler({ ...payload, eventType, eventId });
        this.dlqManager.markProcessed(compositeKey);
        this.dispatchLog.push({ eventType, workerName, success: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.dlqManager.recordFailure({
          eventId,
          eventType,
          workerName,
          payload,
          attempt: 1,
          error: errorMessage,
          requestId
        });
        this.dispatchLog.push({ eventType, workerName, success: false });
      }
    }
  }
}
