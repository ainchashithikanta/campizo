import type { EventBus } from '@college-hub/core';
import { AcademicResourceEvents, type BaseDomainEvent } from '../domain/events.js';
import type { VirusScanWorker } from './virus-scan.worker.js';
import type { PreviewGenerationWorker } from './preview-generation.worker.js';
import type { SearchIndexerWorker } from './search-indexer.worker.js';
import type { StatisticsWorker } from './statistics.worker.js';

export interface EventRouterDependencies {
  eventBus: EventBus;
  virusScanWorker: VirusScanWorker;
  previewWorker: PreviewGenerationWorker;
  searchIndexerWorker: SearchIndexerWorker;
  statisticsWorker: StatisticsWorker;
}

export class AcademicResourceEventRouter {
  constructor(private deps: EventRouterDependencies) {}

  public register(): void {
    // 1. Listen for ResourceVoteAdded to trigger asynchronous Bayesian score calculation
    this.deps.eventBus.subscribe(AcademicResourceEvents.VOTE_ADDED, async (event: BaseDomainEvent<any>) => {
      await this.deps.statisticsWorker.processVote({
        resourceId: event.payload.resourceId,
        collegeId: event.collegeId,
        voteType: event.payload.voteType
      });
    });

    // 2. Listen for VirusScanCompleted to trigger PreviewGeneration
    this.deps.eventBus.subscribe('VirusScanCompleted', async (event: BaseDomainEvent<any>) => {
      await this.deps.previewWorker.process({
        fileId: event.payload.fileId,
        sha256Hash: event.payload.sha256Hash,
        mimeType: 'application/pdf',
        collegeId: event.collegeId
      });
    });

    // 3. Listen for PreviewGenerationCompleted to trigger SearchIndexer
    this.deps.eventBus.subscribe('PreviewGenerationCompleted', async (event: BaseDomainEvent<any>) => {
      await this.deps.searchIndexerWorker.process({
        resourceId: event.aggregateId,
        collegeId: event.collegeId
      });
    });
  }
}
