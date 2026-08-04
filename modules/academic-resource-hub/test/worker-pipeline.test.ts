import { describe, it, expect, beforeEach } from 'vitest';
import type { EventBus, DomainEvent } from '@college-hub/core';
import {
  InMemoryAcademicResourceRepository,
  InMemoryStatisticsRepository,
  InMemoryStorageMetadataRepository,
  VirusScanWorker,
  PreviewGenerationWorker,
  SearchIndexerWorker,
  StatisticsWorker,
  AcademicResourceEventRouter,
  AcademicResourceEvents
} from '../src/index.js';

class TestEventBus implements EventBus {
  private handlers = new Map<string, ((event: DomainEvent<any>) => Promise<void>)[]>();
  public publishedEvents: DomainEvent<any>[] = [];

  public async publish(eventType: string, event: DomainEvent<any>): Promise<void> {
    this.publishedEvents.push(event);
    const list = this.handlers.get(eventType) || [];
    for (const h of list) {
      await h(event);
    }
  }

  public subscribe(eventType: string, handler: (event: DomainEvent<any>) => Promise<void>): void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  public unsubscribe(eventType: string, handler: (event: DomainEvent<any>) => Promise<void>): void {}
}

describe('Background Worker Pipeline & Event Router Suite', () => {
  let storageRepo: InMemoryStorageMetadataRepository;
  let resourceRepo: InMemoryAcademicResourceRepository;
  let statsRepo: InMemoryStatisticsRepository;
  let eventBus: TestEventBus;

  let virusScanWorker: VirusScanWorker;
  let previewWorker: PreviewGenerationWorker;
  let searchIndexerWorker: SearchIndexerWorker;
  let statisticsWorker: StatisticsWorker;
  let router: AcademicResourceEventRouter;

  beforeEach(() => {
    storageRepo = new InMemoryStorageMetadataRepository();
    resourceRepo = new InMemoryAcademicResourceRepository();
    statsRepo = new InMemoryStatisticsRepository();
    eventBus = new TestEventBus();

    virusScanWorker = new VirusScanWorker(storageRepo, eventBus);
    previewWorker = new PreviewGenerationWorker(storageRepo, eventBus);
    searchIndexerWorker = new SearchIndexerWorker(resourceRepo, eventBus);
    statisticsWorker = new StatisticsWorker(statsRepo, eventBus);

    router = new AcademicResourceEventRouter({
      eventBus,
      virusScanWorker,
      previewWorker,
      searchIndexerWorker,
      statisticsWorker
    });

    router.register();
  });

  it('VirusScanWorker - should mark file CLEAN and emit VirusScanCompleted event', async () => {
    const file = await storageRepo.saveFile({
      id: 'file-101',
      versionId: 'ver-101',
      storageProvider: 'S3',
      storageKey: 'uploads/clean_notes.pdf',
      fileName: 'clean_notes.pdf',
      fileSizeBytes: 1024 * 1024,
      mimeType: 'application/pdf',
      sha256Hash: 'hash-clean-101',
      hasPreview: false,
      virusScanStatus: 'PENDING'
    });

    const result = await virusScanWorker.process({
      fileId: file.id,
      sha256Hash: file.sha256Hash,
      storageKey: file.storageKey,
      collegeId: 'college-stanford-001'
    });

    expect(result.status).toBe('CLEAN');
    const updatedFile = await storageRepo.findFileByHash(file.sha256Hash);
    expect(updatedFile?.virusScanStatus).toBe('CLEAN');
  });

  it('StatisticsWorker - should asynchronously compute Bayesian Quality Score on ResourceVoteAdded event', async () => {
    await eventBus.publish(AcademicResourceEvents.VOTE_ADDED, {
      eventId: 'evt-vote-1',
      eventType: AcademicResourceEvents.VOTE_ADDED,
      aggregateId: 'res-vote-505',
      collegeId: 'college-stanford-001',
      timestamp: new Date().toISOString(),
      payload: {
        resourceId: 'res-vote-505',
        voterUserId: 'voter-1',
        voteType: 'HELPFUL'
      }
    });

    const stats = await statsRepo.findByResourceId('res-vote-505', 'college-stanford-001');
    expect(stats).toBeDefined();
    expect(stats?.helpfulVotes).toBe(1);
    expect(stats?.bayesianQualityScore).toBeGreaterThan(0.0);

    const statsEvent = eventBus.publishedEvents.find((e) => e.eventType === AcademicResourceEvents.STATISTICS_UPDATED);
    expect(statsEvent).toBeDefined();
  });

  it('End-to-End Upload Pipeline - VirusScan -> PreviewGeneration -> SearchIndexer', async () => {
    const resource = await resourceRepo.save({
      id: 'res-pipeline-101',
      collegeId: 'college-mit-001',
      departmentId: 'dept-eecs-001',
      subjectId: 'subject-algo-101',
      resourceTypeId: 'type-notes',
      uploaderUserId: 'user-mit-student',
      title: 'Algorithms Lecture Notes',
      slug: 'algorithms-notes',
      academicYear: '2023-24',
      semesterNumber: 4,
      isAnonymous: false,
      status: 'APPROVED',
      verificationStatus: 'VERIFIED'
    });

    const file = await storageRepo.saveFile({
      id: 'file-pipeline-101',
      versionId: 'ver-pipeline-101',
      storageProvider: 'S3',
      storageKey: 'uploads/algo_notes.pdf',
      fileName: 'algo_notes.pdf',
      fileSizeBytes: 2 * 1024 * 1024,
      mimeType: 'application/pdf',
      sha256Hash: 'hash-algo-101',
      hasPreview: false,
      virusScanStatus: 'PENDING'
    });

    await virusScanWorker.process({
      fileId: file.id,
      sha256Hash: file.sha256Hash,
      storageKey: file.storageKey,
      collegeId: 'college-mit-001'
    });

    const updatedFile = await storageRepo.findFileByHash(file.sha256Hash);
    expect(updatedFile?.hasPreview).toBe(true);
    expect(updatedFile?.pageCount).toBe(12);
  });
});
