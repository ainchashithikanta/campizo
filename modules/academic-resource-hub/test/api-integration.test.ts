import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { EventBus, DomainEvent } from '@college-hub/core';
import {
  InMemoryAcademicResourceRepository,
  InMemoryResourceVersionRepository,
  InMemoryStudyCollectionRepository,
  InMemoryContributorRepository,
  InMemoryStatisticsRepository,
  InMemoryStorageMetadataRepository,
  CreateAcademicResourceUseCase,
  PublishAcademicResourceUseCase,
  ArchiveAcademicResourceUseCase,
  ReplaceAcademicResourceUseCase,
  CreateResourceVersionUseCase,
  PublishVersionUseCase,
  RollbackVersionUseCase,
  CreateStudyCollectionUseCase,
  UpdateStudyCollectionUseCase,
  AddResourceToCollectionUseCase,
  RemoveResourceFromCollectionUseCase,
  BookmarkResourceUseCase,
  VoteHelpfulUseCase,
  ReportResourceUseCase,
  RecordDownloadUseCase,
  RecordViewUseCase,
  SearchResourcesQuery,
  GetResourceDetailQuery,
  GetStudyCollectionQuery,
  GetContributorProfileQuery,
  GetModerationQueueQuery,
  ModerateResourceUseCase,
  registerResourceRoutes,
  registerCollectionRoutes,
  registerContributorRoutes,
  registerUploadRoutes
} from '../src/index.js';

class MockEventBus implements EventBus {
  public publishedEvents: DomainEvent<any>[] = [];

  public async publish(eventType: string, event: DomainEvent<any>): Promise<void> {
    this.publishedEvents.push(event);
  }

  public subscribe(eventType: string, handler: (event: DomainEvent<any>) => Promise<void>): void {}

  public unsubscribe(eventType: string, handler: (event: DomainEvent<any>) => Promise<void>): void {}
}

describe('Academic Resource Hub API Integration Suite', () => {
  let app: any;
  let resourceRepo: InMemoryAcademicResourceRepository;
  let versionRepo: InMemoryResourceVersionRepository;
  let collectionRepo: InMemoryStudyCollectionRepository;
  let contributorRepo: InMemoryContributorRepository;
  let statsRepo: InMemoryStatisticsRepository;
  let storageRepo: InMemoryStorageMetadataRepository;
  let eventBus: MockEventBus;

  beforeEach(async () => {
    app = Fastify();
    resourceRepo = new InMemoryAcademicResourceRepository();
    versionRepo = new InMemoryResourceVersionRepository();
    collectionRepo = new InMemoryStudyCollectionRepository();
    contributorRepo = new InMemoryContributorRepository();
    statsRepo = new InMemoryStatisticsRepository();
    storageRepo = new InMemoryStorageMetadataRepository();
    eventBus = new MockEventBus();

    const createResourceUC = new CreateAcademicResourceUseCase(
      resourceRepo,
      versionRepo,
      storageRepo,
      statsRepo,
      eventBus
    );
    const publishResourceUC = new PublishAcademicResourceUseCase(resourceRepo, eventBus);
    const archiveResourceUC = new ArchiveAcademicResourceUseCase(resourceRepo, eventBus);
    const replaceResourceUC = new ReplaceAcademicResourceUseCase(resourceRepo, eventBus);
    const createVersionUC = new CreateResourceVersionUseCase(resourceRepo, versionRepo, eventBus);
    const publishVersionUC = new PublishVersionUseCase(resourceRepo, versionRepo, eventBus);
    const rollbackVersionUC = new RollbackVersionUseCase(resourceRepo, versionRepo, eventBus);
    const bookmarkResourceUC = new BookmarkResourceUseCase(resourceRepo, eventBus);
    const voteHelpfulUC = new VoteHelpfulUseCase(resourceRepo, eventBus);
    const reportResourceUC = new ReportResourceUseCase(resourceRepo, statsRepo, eventBus);
    const recordDownloadUC = new RecordDownloadUseCase(statsRepo, eventBus);
    const recordViewUC = new RecordViewUseCase(statsRepo, eventBus);

    const createCollectionUC = new CreateStudyCollectionUseCase(collectionRepo, eventBus);
    const updateCollectionUC = new UpdateStudyCollectionUseCase(collectionRepo);
    const addResourceUC = new AddResourceToCollectionUseCase(collectionRepo);
    const removeResourceUC = new RemoveResourceFromCollectionUseCase(collectionRepo);

    const searchResourcesQuery = new SearchResourcesQuery(resourceRepo);
    const getResourceDetailQuery = new GetResourceDetailQuery(resourceRepo, statsRepo);
    const getModerationQueueQuery = new GetModerationQueueQuery(resourceRepo);
    const moderateResourceUC = new ModerateResourceUseCase(resourceRepo, eventBus);
    const getCollectionQuery = new GetStudyCollectionQuery(collectionRepo);
    const getContributorProfileQuery = new GetContributorProfileQuery(contributorRepo);

    registerResourceRoutes(app, {
      createResourceUC,
      publishResourceUC,
      archiveResourceUC,
      replaceResourceUC,
      createVersionUC,
      publishVersionUC,
      rollbackVersionUC,
      bookmarkResourceUC,
      voteHelpfulUC,
      reportResourceUC,
      recordDownloadUC,
      recordViewUC,
      searchResourcesQuery,
      getResourceDetailQuery,
      getModerationQueueQuery,
      moderateResourceUC
    });

    registerCollectionRoutes(app, {
      createCollectionUC,
      updateCollectionUC,
      addResourceUC,
      removeResourceUC,
      getCollectionQuery
    });

    registerContributorRoutes(app, {
      getContributorProfileQuery
    });

    registerUploadRoutes(app);

    await app.ready();
  });

  describe('Resource & Upload Routes', () => {
    it('POST /api/v1/resources - should create a resource and return 201 Created', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        headers: {
          'x-college-id': 'college-stanford-001',
          'x-user-id': 'user-student-101'
        },
        payload: {
          departmentId: 'dept-cse-001',
          subjectId: 'subject-os-501',
          resourceTypeId: 'type-pyq-001',
          title: 'CS501 Operating Systems 2023 End-Sem PYQ',
          slug: 'cs501-os-2023-pyq',
          academicYear: '2023-24',
          semesterNumber: 5,
          fileSizeBytes: 2 * 1024 * 1024,
          mimeType: 'application/pdf',
          sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          fileName: 'OS_2023_PYQ.pdf',
          storageKey: 's3/path/OS_2023_PYQ.pdf'
        }
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('CS501 Operating Systems 2023 End-Sem PYQ');
    });

    it('POST /api/v1/resources - should return 409 Conflict when file SHA-256 hash is duplicate', async () => {
      const payload = {
        departmentId: 'dept-cse-001',
        subjectId: 'subject-os-501',
        resourceTypeId: 'type-pyq-001',
        title: 'Original OS Notes',
        slug: 'original-os-notes',
        academicYear: '2023-24',
        semesterNumber: 5,
        fileSizeBytes: 1 * 1024 * 1024,
        mimeType: 'application/pdf',
        sha256Hash: '1111111111111111111111111111111111111111111111111111111111111111',
        fileName: 'Notes.pdf',
        storageKey: 's3/path/Notes1.pdf'
      };

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        headers: { 'x-college-id': 'college-stanford-001', 'x-user-id': 'user-1' },
        payload
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        headers: { 'x-college-id': 'college-stanford-001', 'x-user-id': 'user-2' },
        payload: { ...payload, title: 'Duplicate Notes', slug: 'duplicate-notes' }
      });

      expect(response.statusCode).toBe(409);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe('DUPLICATE_FILE_HASH');
    });

    it('POST /api/v1/uploads/session - should return pre-signed upload URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/uploads/session',
        payload: {
          fileName: 'TestUpload.pdf',
          fileSizeBytes: 1 * 1024 * 1024,
          mimeType: 'application/pdf',
          sha256Hash: '2222222222222222222222222222222222222222222222222222222222222222'
        }
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.body);
      expect(json.data.uploadId).toBeDefined();
      expect(json.data.preSignedUploadUrl).toContain('https://');
    });
  });

  describe('Engagement & Self-Vote Prohibition', () => {
    it('POST /api/v1/resources/:id/votes - should return 403 Forbidden on self-vote', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        headers: { 'x-college-id': 'college-stanford-001', 'x-user-id': 'uploader-user-101' },
        payload: {
          departmentId: 'dept-cse-001',
          subjectId: 'subject-os-501',
          resourceTypeId: 'type-notes-001',
          title: 'OS Self Vote Notes',
          slug: 'os-self-vote-notes',
          academicYear: '2023-24',
          semesterNumber: 5,
          fileSizeBytes: 1 * 1024 * 1024,
          mimeType: 'application/pdf',
          sha256Hash: '3333333333333333333333333333333333333333333333333333333333333333',
          fileName: 'Notes.pdf',
          storageKey: 's3/path/Notes.pdf'
        }
      });

      const resourceId = JSON.parse(createRes.body).data.id;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/resources/${resourceId}/votes`,
        headers: { 'x-college-id': 'college-stanford-001', 'x-user-id': 'uploader-user-101' },
        payload: { isHelpful: true }
      });

      expect(response.statusCode).toBe(403);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe('SELF_VOTE_PROHIBITED');
    });

    it('POST /api/v1/resources/:id/votes - should record helpful vote for peer student', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        headers: { 'x-college-id': 'college-stanford-001', 'x-user-id': 'uploader-user-101' },
        payload: {
          departmentId: 'dept-cse-001',
          subjectId: 'subject-os-501',
          resourceTypeId: 'type-notes-001',
          title: 'OS Peer Vote Notes',
          slug: 'os-peer-vote-notes',
          academicYear: '2023-24',
          semesterNumber: 5,
          fileSizeBytes: 1 * 1024 * 1024,
          mimeType: 'application/pdf',
          sha256Hash: '4444444444444444444444444444444444444444444444444444444444444444',
          fileName: 'Notes.pdf',
          storageKey: 's3/path/Notes.pdf'
        }
      });

      const resourceId = JSON.parse(createRes.body).data.id;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/resources/${resourceId}/votes`,
        headers: { 'x-college-id': 'college-stanford-001', 'x-user-id': 'peer-voter-202' },
        payload: { isHelpful: true }
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.data.status).toBe('VOTE_RECORDED');
    });
  });

  describe('Collections & Contributor Routes', () => {
    it('POST /api/v1/collections - should create study collection', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/collections',
        headers: { 'x-college-id': 'college-stanford-001', 'x-user-id': 'user-cr-101' },
        payload: { title: 'OS Exam Kit 2024', description: 'Notes + PYQs' }
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.body);
      expect(json.data.title).toBe('OS Exam Kit 2024');
    });

    it('GET /api/v1/contributors/:id - should return contributor profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/contributors/user-student-101',
        headers: { 'x-college-id': 'college-stanford-001' }
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.data.userId).toBe('user-student-101');
    });
  });
});
