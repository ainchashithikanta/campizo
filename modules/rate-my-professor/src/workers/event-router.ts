import type { EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import { DeadLetterQueueManager } from './dlq-manager.js';
import { StatsEngineWorker } from './stats-engine.worker.js';
import { SearchIndexerWorker } from './search-indexer.worker.js';
import { CacheInvalidationWorker } from './cache-invalidation.worker.js';
import { ModerationQueueWorker } from './moderation-queue.worker.js';

export class RateMyProfessorEventRouter {
  public readonly dlqManager = new DeadLetterQueueManager();

  constructor(
    private readonly eventBus: EventBus,
    private readonly statsWorker: StatsEngineWorker,
    private readonly searchWorker: SearchIndexerWorker,
    private readonly cacheWorker: CacheInvalidationWorker,
    private readonly modWorker: ModerationQueueWorker
  ) {}

  public registerSubscriptions(): void {
    logger.info('Registering event-driven background worker subscriptions for Rate My Professor module...');

    // 1. ReviewCreated Handler
    this.eventBus.subscribe('ReviewCreated', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewCreated',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewCreated event');
          if (event.payload?.reviewId) {
            await this.modWorker.evaluateReviewRisk(event.payload.reviewId, event.collegeId);
          }
        }
      );
    });

    // 2. ReviewPublished Handler
    this.eventBus.subscribe('ReviewPublished', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewPublished',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewPublished event');
          if (event.payload?.professorId) {
            await this.statsWorker.recalculateForProfessor(event.payload.professorId, event.collegeId);
            await this.searchWorker.indexProfessor(event.payload.professorId, event.collegeId);
            this.cacheWorker.invalidateProfessorCache(
              event.collegeId,
              event.payload.professorId,
              event.payload.professorId
            );
          }
        }
      );
    });

    // 3. ReviewUpdated Handler
    this.eventBus.subscribe('ReviewUpdated', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewUpdated',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewUpdated event');
          if (event.payload?.professorId) {
            await this.statsWorker.recalculateForProfessor(event.payload.professorId, event.collegeId);
            this.cacheWorker.invalidateProfessorCache(
              event.collegeId,
              event.payload.professorId,
              event.payload.professorId
            );
          }
        }
      );
    });

    // 4. ReviewDeleted Handler
    this.eventBus.subscribe('ReviewDeleted', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewDeleted',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewDeleted event');
          if (event.payload?.professorId) {
            await this.statsWorker.recalculateForProfessor(event.payload.professorId, event.collegeId);
            this.cacheWorker.invalidateProfessorCache(
              event.collegeId,
              event.payload.professorId,
              event.payload.professorId
            );
          }
        }
      );
    });

    // 5. ReviewHidden Handler
    this.eventBus.subscribe('ReviewHidden', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewHidden',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewHidden event');
          if (event.payload?.professorId) {
            await this.statsWorker.recalculateForProfessor(event.payload.professorId, event.collegeId);
            this.cacheWorker.invalidateProfessorCache(
              event.collegeId,
              event.payload.professorId,
              event.payload.professorId
            );
          }
        }
      );
    });

    // 6. ReviewReported Handler
    this.eventBus.subscribe('ReviewReported', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewReported',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewReported event');
        }
      );
    });

    // 7. ReviewVoteAdded Handler
    this.eventBus.subscribe('ReviewVoteAdded', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewVoteAdded',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewVoteAdded event');
          this.cacheWorker.invalidateProfessorCache(event.collegeId, event.payload?.reviewId || 'review');
        }
      );
    });

    // 8. ReviewVoteRemoved Handler
    this.eventBus.subscribe('ReviewVoteRemoved', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ReviewVoteRemoved',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ReviewVoteRemoved event');
          this.cacheWorker.invalidateProfessorCache(event.collegeId, event.payload?.reviewId || 'review');
        }
      );
    });

    // 9. FacultyResponded Handler
    this.eventBus.subscribe('FacultyResponded', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'FacultyResponded',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling FacultyResponded event');
          this.cacheWorker.invalidateProfessorCache(event.collegeId, event.payload?.professorId || 'prof');
        }
      );
    });

    // 10. ProfessorMerged Handler
    this.eventBus.subscribe('ProfessorMerged', async (event: any) => {
      await this.dlqManager.executeWithRetry(
        event.eventId || `evt-${Date.now()}`,
        'ProfessorMerged',
        event.collegeId || 'default-college',
        event.payload,
        async () => {
          logger.info({ eventId: event.eventId, collegeId: event.collegeId }, 'Handling ProfessorMerged event');
          if (event.payload?.targetProfessorId) {
            await this.searchWorker.indexProfessor(event.payload.targetProfessorId, event.collegeId);
            this.cacheWorker.invalidateProfessorCache(event.collegeId, event.payload.targetProfessorId);
          }
        }
      );
    });

    logger.info('All 10 background worker subscriptions registered cleanly.');
  }
}
