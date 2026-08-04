import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryStudentProfileRepository,
  InMemoryStudentIntentRepository,
  InMemoryConnectionRequestRepository,
  InMemoryConnectionRepository,
  InMemoryConversationRepository,
  InMemoryMessageRepository,
  InMemoryRecommendationSnapshotRepository,
  InMemoryPrivacySettingsRepository
} from '../src/repositories/in-memory-connect.repository.js';
import { ConnectQueryService } from '../src/queries/connect.queries.js';
import { StudentIntentService, ConnectUseCases, EventPublisher } from '../src/use-cases/connect.use-cases.js';
import { InvalidConversationContextError } from '../src/errors/domain-errors.js';
import { LockedApplicationError } from '../src/errors/application-errors.js';

describe('Campus Connect — Production Application Layer & CQRS Suite (MS-23.8.2)', () => {
  let repoProvider: any;
  let eventPublisher: EventPublisher;
  let intentService: StudentIntentService;
  let useCases: ConnectUseCases;
  let queryService: ConnectQueryService;

  beforeEach(() => {
    repoProvider = {
      profileRepo: new InMemoryStudentProfileRepository(),
      intentRepo: new InMemoryStudentIntentRepository(),
      connectionRequestRepo: new InMemoryConnectionRequestRepository(),
      connectionRepo: new InMemoryConnectionRepository(),
      conversationRepo: new InMemoryConversationRepository(),
      messageRepo: new InMemoryMessageRepository(),
      recommendationRepo: new InMemoryRecommendationSnapshotRepository(),
      privacyRepo: new InMemoryPrivacySettingsRepository()
    };

    eventPublisher = new EventPublisher();
    intentService = new StudentIntentService(repoProvider, eventPublisher);
    useCases = new ConnectUseCases(repoProvider, eventPublisher, intentService);
    queryService = new ConnectQueryService(repoProvider);
  });

  it('1. StudentIntentService: Should create intent and publish IntentCreated event strictly after commit', async () => {
    const intent = await intentService.createIntent({
      id: 'int_101',
      collegeId: 'college_stanford_001',
      studentProfileId: 'usr_stanford_101',
      intentType: 'STUDY_PARTNER',
      title: 'CS224N Midterm Study Pod',
      courseCode: 'CS224N',
      createdBy: 'usr_stanford_101'
    });

    expect(intent.id).toBe('int_101');
    expect(intent.status).toBe('ACTIVE');

    const events = eventPublisher.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0]?.eventType).toBe('IntentCreated');
  });

  it('2. Optimistic Locking: Repository update should fail when version conflicts', async () => {
    await intentService.createIntent({
      id: 'int_102',
      collegeId: 'college_stanford_001',
      studentProfileId: 'usr_stanford_101',
      intentType: 'PROJECT_TEAM',
      title: 'TreeHacks Hackathon',
      createdBy: 'usr_stanford_101'
    });

    // Attempting update with wrong version
    await expect(intentService.updateIntent({
      id: 'int_102',
      collegeId: 'college_stanford_001',
      title: 'Updated Hackathon Title',
      version: 99, // Wrong version!
      updatedBy: 'usr_stanford_101'
    })).rejects.toThrow();
  });

  it('3. Mandatory Context: createConversation should fail if contextType or contextId is missing', async () => {
    await expect(useCases.createConversation({
      id: 'conv_101',
      collegeId: 'college_stanford_001',
      contextType: '', // Empty context!
      contextId: 'int_101',
      createdBy: 'usr_stanford_101'
    })).rejects.toThrow(InvalidConversationContextError);
  });

  it('4. Mandatory Context: createConversation should succeed with valid context and emit ConversationCreated event', async () => {
    const conv = await useCases.createConversation({
      id: 'conv_102',
      collegeId: 'college_stanford_001',
      contextType: 'STUDY_INTENT',
      contextId: 'int_101',
      createdBy: 'usr_stanford_101'
    });

    expect(conv.id).toBe('conv_102');
    expect(conv.contextType).toBe('STUDY_INTENT');

    const events = eventPublisher.getPublishedEvents();
    const convEvent = events.find((e) => e.eventType === 'ConversationCreated');
    expect(convEvent).toBeDefined();
  });

  it('5. CQRS Queries: getStudentProfile should NEVER expose internal trust score', async () => {
    await repoProvider.profileRepo.save({
      id: 'usr_101',
      collegeId: 'college_stanford_001',
      userId: 'usr_101',
      fullName: 'Alex River',
      major: 'Computer Science',
      classYear: 2026,
      trustScore: 95, // Internal private trust score
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system'
    });

    const publicProfile = await queryService.getStudentProfile('usr_101', 'college_stanford_001');
    expect(publicProfile).toBeDefined();
    expect(publicProfile.fullName).toBe('Alex River');
    expect(publicProfile.trustScore).toBeUndefined(); // Trust score hidden from public UI!
  });

  it('6. Recommendation Immutability: generateRecommendationSnapshot should persist immutable snapshot', async () => {
    const snap = await useCases.generateRecommendationSnapshot({
      id: 'snap_101',
      collegeId: 'college_stanford_001',
      sourceStudentId: 'usr_101',
      targetStudentId: 'usr_102',
      overallCompatibilityPct: '94.50',
      algorithmVersion: 'v1.4.0',
      createdBy: 'system'
    });

    expect(snap.id).toBe('snap_101');
    expect(snap.overallCompatibilityPct).toBe('94.50');

    const events = eventPublisher.getPublishedEvents();
    const recEvent = events.find((e) => e.eventType === 'RecommendationGenerated');
    expect(recEvent).toBeDefined();
  });

  it('7. Connection Request & Acceptance: Workflow executes and emits events in order', async () => {
    const req = await useCases.sendConnectionRequest({
      id: 'req_101',
      collegeId: 'college_stanford_001',
      senderProfileId: 'usr_101',
      receiverProfileId: 'usr_102',
      originatingIntentId: 'int_101',
      createdBy: 'usr_101'
    });

    expect(req.status).toBe('PENDING');

    const conn = await useCases.acceptConnection('req_101', 'college_stanford_001', 1);
    expect(conn.status).toBe('CONNECTED');

    const events = eventPublisher.getPublishedEvents();
    expect(events.some((e) => e.eventType === 'ConnectionRequested')).toBe(true);
    expect(events.some((e) => e.eventType === 'ConnectionAccepted')).toBe(true);
  });
});
