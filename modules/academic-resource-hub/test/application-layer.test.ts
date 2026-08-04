import { describe, it, expect, beforeEach } from 'vitest';
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
  AddResourceToCollectionUseCase,
  VoteHelpfulUseCase,
  ReportResourceUseCase,
  RecordDownloadUseCase,
  GetResourceDetailQuery,
  SearchResourcesQuery,
  DuplicateHashError,
  SelfVoteError,
  CollectionLimitExceededError,
  AcademicResourceEvents
} from '../src/index.js';

class MockEventBus implements EventBus {
  public publishedEvents: DomainEvent<any>[] = [];

  public async publish(eventType: string, event: DomainEvent<any>): Promise<void> {
    this.publishedEvents.push(event);
  }

  public subscribe(eventType: string, handler: (event: DomainEvent<any>) => Promise<void>): void {
    // Mock subscription
  }

  public unsubscribe(eventType: string, handler: (event: DomainEvent<any>) => Promise<void>): void {
    // Mock unsubscription
  }
}

describe('Academic Resource Hub Application Layer Suite', () => {
  let resourceRepo: InMemoryAcademicResourceRepository;
  let versionRepo: InMemoryResourceVersionRepository;
  let collectionRepo: InMemoryStudyCollectionRepository;
  let contributorRepo: InMemoryContributorRepository;
  let statsRepo: InMemoryStatisticsRepository;
  let storageRepo: InMemoryStorageMetadataRepository;
  let eventBus: MockEventBus;

  beforeEach(() => {
    resourceRepo = new InMemoryAcademicResourceRepository();
    versionRepo = new InMemoryResourceVersionRepository();
    collectionRepo = new InMemoryStudyCollectionRepository();
    contributorRepo = new InMemoryContributorRepository();
    statsRepo = new InMemoryStatisticsRepository();
    storageRepo = new InMemoryStorageMetadataRepository();
    eventBus = new MockEventBus();
  });

  describe('Use-Case: CreateAcademicResourceUseCase', () => {
    it('should create an academic resource, store version & file, and publish AcademicResourceCreated event', async () => {
      const useCase = new CreateAcademicResourceUseCase(resourceRepo, versionRepo, storageRepo, statsRepo, eventBus);

      const resource = await useCase.execute({
        collegeId: 'college-stanford-001',
        departmentId: 'dept-cse-001',
        subjectId: 'subject-os-501',
        resourceTypeId: 'type-pyq-001',
        uploaderUserId: 'user-student-101',
        title: 'CS501 Operating Systems 2023 PYQ',
        slug: 'cs501-operating-systems-2023-pyq',
        academicYear: '2023-24',
        semesterNumber: 5,
        fileSizeBytes: 2 * 1024 * 1024,
        mimeType: 'application/pdf',
        sha256Hash: 'hash-unique-12345',
        fileName: 'OS_PYQ_2023.pdf',
        storageKey: 's3/path/OS_PYQ_2023.pdf'
      });

      expect(resource).toBeDefined();
      expect(resource.title).toBe('CS501 Operating Systems 2023 PYQ');
      expect(resource.status).toBe('APPROVED');
      expect(eventBus.publishedEvents.length).toBe(1);
      expect(eventBus.publishedEvents[0].eventType).toBe(AcademicResourceEvents.CREATED);
    });

    it('should reject duplicate SHA-256 file uploads with DuplicateHashError', async () => {
      const useCase = new CreateAcademicResourceUseCase(resourceRepo, versionRepo, storageRepo, statsRepo, eventBus);

      await useCase.execute({
        collegeId: 'college-stanford-001',
        departmentId: 'dept-cse-001',
        subjectId: 'subject-os-501',
        resourceTypeId: 'type-pyq-001',
        uploaderUserId: 'user-student-101',
        title: 'CS501 OS Notes Unit 1',
        slug: 'cs501-os-notes-unit-1',
        academicYear: '2023-24',
        semesterNumber: 5,
        fileSizeBytes: 1 * 1024 * 1024,
        mimeType: 'application/pdf',
        sha256Hash: 'hash-duplicate-999',
        fileName: 'OS_Notes.pdf',
        storageKey: 's3/path/OS_Notes.pdf'
      });

      await expect(
        useCase.execute({
          collegeId: 'college-stanford-001',
          departmentId: 'dept-cse-001',
          subjectId: 'subject-os-501',
          resourceTypeId: 'type-pyq-001',
          uploaderUserId: 'user-student-202',
          title: 'Duplicate OS Notes Upload',
          slug: 'duplicate-os-notes',
          academicYear: '2023-24',
          semesterNumber: 5,
          fileSizeBytes: 1 * 1024 * 1024,
          mimeType: 'application/pdf',
          sha256Hash: 'hash-duplicate-999',
          fileName: 'OS_Notes.pdf',
          storageKey: 's3/path/OS_Notes_2.pdf'
        })
      ).rejects.toThrow(DuplicateHashError);
    });
  });

  describe('Use-Case: VoteHelpfulUseCase & Self-Vote Rule', () => {
    it('should publish ResourceVoteAdded event when a student votes on a resource', async () => {
      const createUC = new CreateAcademicResourceUseCase(resourceRepo, versionRepo, storageRepo, statsRepo, eventBus);
      const resource = await createUC.execute({
        collegeId: 'college-stanford-001',
        departmentId: 'dept-cse-001',
        subjectId: 'subject-os-501',
        resourceTypeId: 'type-notes-001',
        uploaderUserId: 'user-student-101',
        title: 'OS Lecture Notes',
        slug: 'os-lecture-notes',
        academicYear: '2023-24',
        semesterNumber: 5,
        fileSizeBytes: 1 * 1024 * 1024,
        mimeType: 'application/pdf',
        sha256Hash: 'hash-vote-test-1',
        fileName: 'Notes.pdf',
        storageKey: 's3/path/Notes.pdf'
      });

      const voteUC = new VoteHelpfulUseCase(resourceRepo, eventBus);
      await voteUC.execute(resource.id, 'user-voter-202', 'college-stanford-001', true);

      const voteEvent = eventBus.publishedEvents.find((e) => e.eventType === AcademicResourceEvents.VOTE_ADDED);
      expect(voteEvent).toBeDefined();
      expect(voteEvent?.payload.voteType).toBe('HELPFUL');
      expect(voteEvent?.payload.voterUserId).toBe('user-voter-202');
    });

    it('should throw SelfVoteError when uploader votes on their own resource', async () => {
      const createUC = new CreateAcademicResourceUseCase(resourceRepo, versionRepo, storageRepo, statsRepo, eventBus);
      const resource = await createUC.execute({
        collegeId: 'college-stanford-001',
        departmentId: 'dept-cse-001',
        subjectId: 'subject-os-501',
        resourceTypeId: 'type-notes-001',
        uploaderUserId: 'user-student-101',
        title: 'OS Lecture Notes Self Vote Test',
        slug: 'os-lecture-notes-self-vote',
        academicYear: '2023-24',
        semesterNumber: 5,
        fileSizeBytes: 1 * 1024 * 1024,
        mimeType: 'application/pdf',
        sha256Hash: 'hash-self-vote-1',
        fileName: 'Notes.pdf',
        storageKey: 's3/path/Notes.pdf'
      });

      const voteUC = new VoteHelpfulUseCase(resourceRepo, eventBus);
      await expect(voteUC.execute(resource.id, 'user-student-101', 'college-stanford-001', true)).rejects.toThrow(
        'Uploaders cannot vote on their own study materials.'
      );
    });
  });

  describe('Use-Case: ReportResourceUseCase & Auto-Quarantine', () => {
    it('should automatically quarantine resource when 3 community reports are received', async () => {
      const createUC = new CreateAcademicResourceUseCase(resourceRepo, versionRepo, storageRepo, statsRepo, eventBus);
      const resource = await createUC.execute({
        collegeId: 'college-stanford-001',
        departmentId: 'dept-cse-001',
        subjectId: 'subject-os-501',
        resourceTypeId: 'type-notes-001',
        uploaderUserId: 'user-student-101',
        title: 'Questionable OS Notes',
        slug: 'questionable-os-notes',
        academicYear: '2023-24',
        semesterNumber: 5,
        fileSizeBytes: 1 * 1024 * 1024,
        mimeType: 'application/pdf',
        sha256Hash: 'hash-report-test-1',
        fileName: 'Notes.pdf',
        storageKey: 's3/path/Notes.pdf'
      });

      const reportUC = new ReportResourceUseCase(resourceRepo, statsRepo, eventBus);

      await reportUC.execute(resource.id, 'user-reporter-1', 'college-stanford-001', 'WRONG_CATEGORY');
      await reportUC.execute(resource.id, 'user-reporter-2', 'college-stanford-001', 'OUTDATED');
      await reportUC.execute(resource.id, 'user-reporter-3', 'college-stanford-001', 'SPAM');

      const checkedResource = await resourceRepo.findById(resource.id, 'college-stanford-001');
      expect(checkedResource?.status).toBe('QUARANTINED');
    });
  });

  describe('Use-Case: Study Collections & 50 Item Limit', () => {
    it('should throw CollectionLimitExceededError when adding 51st item to collection', async () => {
      const collectionUC = new CreateStudyCollectionUseCase(collectionRepo, eventBus);
      const collection = await collectionUC.execute('college-stanford-001', 'user-cr-101', 'OS Mid-Sem Survival Kit');

      const addItemUC = new AddResourceToCollectionUseCase(collectionRepo);

      for (let i = 1; i <= 50; i++) {
        await collectionRepo.addResourceToCollection(collection.id, `res-item-${i}`, i);
      }

      await expect(addItemUC.execute(collection.id, 'res-item-51', 'college-stanford-001')).rejects.toThrow(
        'Study collection capacity limit of 50 items reached.'
      );
    });
  });

  describe('CQRS Query: GetResourceDetailQuery & SearchResourcesQuery', () => {
    it('should fetch composite detail and search materials by subject', async () => {
      const createUC = new CreateAcademicResourceUseCase(resourceRepo, versionRepo, storageRepo, statsRepo, eventBus);
      const resource = await createUC.execute({
        collegeId: 'college-stanford-001',
        departmentId: 'dept-cse-001',
        subjectId: 'subject-os-501',
        resourceTypeId: 'type-pyq-001',
        uploaderUserId: 'user-student-101',
        title: 'CS501 Operating Systems Final Exam 2023',
        slug: 'cs501-os-final-exam-2023',
        academicYear: '2023-24',
        semesterNumber: 5,
        fileSizeBytes: 2 * 1024 * 1024,
        mimeType: 'application/pdf',
        sha256Hash: 'hash-query-test-1',
        fileName: 'OS_Final_2023.pdf',
        storageKey: 's3/path/OS_Final_2023.pdf'
      });

      const detailQuery = new GetResourceDetailQuery(resourceRepo, statsRepo);
      const detail = await detailQuery.execute(resource.id, 'college-stanford-001');

      expect(detail.resource.id).toBe(resource.id);
      expect(detail.stats).toBeDefined();

      const searchQuery = new SearchResourcesQuery(resourceRepo);
      const searchResults = await searchQuery.execute('college-stanford-001', 'subject-os-501', 'Final');

      expect(searchResults.length).toBe(1);
      expect(searchResults[0].title).toContain('Final');
    });
  });
});
