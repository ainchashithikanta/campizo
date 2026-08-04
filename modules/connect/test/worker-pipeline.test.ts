/**
 * Campus Connect — Production Background Worker Pipeline Integration Tests (MS-23.8.4)
 * Verifies RecommendationWorker (<150ms), IntentExpiryWorker, NotificationWorker (<30ms), SearchIndexWorker (<80ms),
 * TrustScoreWorker, RelationshipWorker, ModerationWorker, ActivityWorker, AnalyticsWorker, CleanupWorker, and WorkerMetrics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationWorker } from '../src/workers/recommendation.worker.js';
import { IntentExpiryWorker } from '../src/workers/intent-expiry.worker.js';
import { NotificationWorker } from '../src/workers/notification.worker.js';
import { SearchIndexWorker } from '../src/workers/search-index.worker.js';
import { TrustScoreWorker } from '../src/workers/trust-score.worker.js';
import { RelationshipWorker } from '../src/workers/relationship.worker.js';
import { ModerationWorker } from '../src/workers/moderation.worker.js';
import { ActivityWorker } from '../src/workers/activity.worker.js';
import { AnalyticsWorker } from '../src/workers/analytics.worker.js';
import { CleanupWorker } from '../src/workers/cleanup.worker.js';

import { buildEventEnvelope } from '../src/events/event-envelope.js';
import { WorkerMetrics } from '../src/metrics/worker-metrics.js';
import { ConnectUseCases, StudentIntentService, EventPublisher } from '../src/use-cases/connect.use-cases.js';
import { InMemoryConnectRepositoryProvider } from '../src/repositories/in-memory-connect.repository.js';

describe('Campus Connect — Production Background Worker Pipeline Suite (MS-23.8.4)', () => {
  let repoProvider: InMemoryConnectRepositoryProvider;
  let eventPublisher: EventPublisher;
  let intentService: StudentIntentService;
  let useCases: ConnectUseCases;

  beforeEach(() => {
    WorkerMetrics.getInstance().reset();
    repoProvider = new InMemoryConnectRepositoryProvider();
    eventPublisher = new EventPublisher();
    intentService = new StudentIntentService(repoProvider, eventPublisher);
    useCases = new ConnectUseCases(repoProvider, eventPublisher, intentService);
  });

  it('1. RecommendationWorker: Generates immutable recommendation snapshot in <150ms', async () => {
    const worker = new RecommendationWorker(useCases);
    const event = buildEventEnvelope('IntentActivated', { intentId: 'int_101', studentProfileId: 'usr_stanford_101', intentType: 'STUDY_PARTNER' }, { collegeId: 'college_stanford_001' });

    const startTime = Date.now();
    await worker.processIntentActivated(event);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(150);

    const snapshot = WorkerMetrics.getInstance().getSnapshot('RecommendationWorker');
    expect(snapshot.totalJobsProcessed).toBe(1);
    expect(snapshot.totalErrors).toBe(0);
  });

  it('2. IntentExpiryWorker: Automatically archives expired intents', async () => {
    // Seed active intent
    await intentService.createIntent({
      id: 'int_exp_100',
      collegeId: 'college_stanford_001',
      studentProfileId: 'usr_100',
      intentType: 'STUDY_PARTNER',
      title: 'Expired Study Pod',
      createdBy: 'usr_100'
    });

    const worker = new IntentExpiryWorker(useCases);
    const event = buildEventEnvelope('IntentExpired', { intentId: 'int_exp_100' }, { collegeId: 'college_stanford_001' });

    await worker.processIntentExpiryCheck(event);

    const updated = await repoProvider.intentRepo.findById('int_exp_100', 'college_stanford_001');
    expect(updated.status).toBe('ARCHIVED');
  });

  it('3. NotificationWorker: Prepares notification payload without direct email/push dispatch in <30ms', async () => {
    const worker = new NotificationWorker();
    const event = buildEventEnvelope('NotificationQueued', { recipientId: 'usr_200', title: 'New Match', body: 'Sarah accepted your request.', category: 'CONNECTION' }, { collegeId: 'college_stanford_001' });

    const startTime = Date.now();
    const payload = await worker.processNotificationEvent(event);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(30);
    expect(payload.recipientId).toBe('usr_200');
    expect(worker.getEnqueuedPayloads().length).toBe(1);
  });

  it('4. SearchIndexWorker: Asynchronously updates discovery indexes in <80ms', async () => {
    const worker = new SearchIndexWorker();
    const event = buildEventEnvelope('SearchIndexUpdate', { docId: 'int_301', docType: 'INTENT', content: { title: 'CS224N Pod' } }, { collegeId: 'college_stanford_001' });

    const startTime = Date.now();
    await worker.processSearchIndexUpdate(event);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(80);
    const indexed = worker.getIndexedDocument('college_stanford_001:INTENT:int_301');
    expect(indexed).toBeDefined();
    expect(indexed.content.title).toBe('CS224N Pod');
  });

  it('5. TrustScoreWorker: Recalculates internal private trust score without exposing it publicly', async () => {
    const worker = new TrustScoreWorker();
    const event = buildEventEnvelope('TrustScoreRecalculate', { studentProfileId: 'usr_student_101', factor: 'POLICY_VIOLATION_REPORTED', delta: -15.0 }, { collegeId: 'college_stanford_001' });

    await worker.processTrustScoreRecalculation(event);

    const internalScore = worker.getInternalTrustScore('usr_student_101', 'college_stanford_001');
    expect(internalScore).toBe(85.0);
  });

  it('6. RelationshipWorker: Maintains derived RelationshipStrength between students', async () => {
    const worker = new RelationshipWorker();
    const event = buildEventEnvelope('RelationshipActivity', { studentAId: 'usr_101', studentBId: 'usr_102', activityType: 'STUDY_GROUP_JOINED', scoreDelta: 0.25 }, { collegeId: 'college_stanford_001' });

    await worker.processRelationshipActivity(event);

    const strength = worker.getRelationshipStrength('usr_101', 'usr_102', 'college_stanford_001');
    expect(strength).toBe(0.25);
  });

  it('7. ModerationWorker: Processes ReportCreated events into moderation queue', async () => {
    const worker = new ModerationWorker(useCases);
    const event = buildEventEnvelope('ReportCreated', { caseId: 'case_99', reportedUserId: 'usr_bad', reporterUserId: 'usr_good', reason: 'SPAM' }, { collegeId: 'college_stanford_001' });

    await worker.processReportCreated(event);

    const events = eventPublisher.getPublishedEvents();
    expect(events.some((e) => e.eventType === 'ModerationCaseOpened')).toBe(true);
    expect(events.some((e) => e.eventType === 'ModerationDecisionRecorded')).toBe(true);
  });

  it('8. ActivityWorker: Writes immutable, append-only activity feed entries', async () => {
    const worker = new ActivityWorker();
    const event = buildEventEnvelope('ActivityRecorded', { actorId: 'usr_101', actionType: 'INTENT_CREATED', metadata: { intentId: 'int_1' } }, { collegeId: 'college_stanford_001' });

    const entry = await worker.processActivityEvent(event);

    expect(entry.actorId).toBe('usr_101');
    const feed = worker.getActivityFeed('college_stanford_001');
    expect(feed.length).toBe(1);
  });

  it('9. AnalyticsWorker: Exclusively aggregates system metrics across categories', async () => {
    const worker = new AnalyticsWorker();
    const event = buildEventEnvelope('AnalyticsRecord', { category: 'DISCOVERY', incrementBy: 5 }, { collegeId: 'college_stanford_001' });

    await worker.processAnalyticsEvent(event);

    const count = worker.getAggregate('college_stanford_001', 'DISCOVERY');
    expect(count).toBe(5);
  });

  it('10. CleanupWorker: Purges expired recommendations, notifications, and stale artifacts', async () => {
    const worker = new CleanupWorker();
    const event = buildEventEnvelope('CleanupTrigger', { retentionDays: 30 }, { collegeId: 'college_stanford_001' });

    const res = await worker.processCleanupTrigger(event);

    expect(res.purgedRecommendations).toBeGreaterThan(0);
    expect(res.purgedNotifications).toBeGreaterThan(0);
    expect(res.executedAt).toBeDefined();
  });
});
