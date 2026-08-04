import { describe, it, expect, beforeEach } from 'vitest';
import {
  DlqManager,
  EventRouter,
  scanForPii,
  piiScanWorkerHandler,
  calculateRankingScores,
  rankingWorkerHandler,
  statisticsWorkerHandler,
  searchIndexerWorkerHandler,
  notificationWorkerHandler,
  moderationWorkerHandler,
  cleanupWorkerHandler,
  InMemoryStatisticsRepository,
  InMemoryNotificationRepository,
  InMemoryRankingRepository
} from '../src/index.js';

describe('Campus Confessions Worker Pipeline & Event Router', () => {
  const COLLEGE = 'college-stanford-001';
  let dlqManager: DlqManager;

  beforeEach(() => {
    dlqManager = new DlqManager({ maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 3000, poisonThreshold: 3 });
  });

  // ── DLQ Manager ────────────────────────────────────────────────────

  describe('DLQ Manager', () => {
    it('should calculate exponential backoff: base * 2^(attempt-1), capped at maxDelayMs', () => {
      expect(dlqManager.calculateDelay(1)).toBe(100);
      expect(dlqManager.calculateDelay(2)).toBe(200);
      expect(dlqManager.calculateDelay(3)).toBe(400);
      expect(dlqManager.calculateDelay(4)).toBe(800);
      expect(dlqManager.calculateDelay(10)).toBe(3000); // capped
    });

    it('should enforce idempotency — reject already-processed events', () => {
      expect(dlqManager.isAlreadyProcessed('evt-1')).toBe(false);
      dlqManager.markProcessed('evt-1');
      expect(dlqManager.isAlreadyProcessed('evt-1')).toBe(true);
    });

    it('should detect poison messages at configured threshold', () => {
      const entry1 = dlqManager.recordFailure({
        eventId: 'evt-poison', eventType: 'VoteAdded', workerName: 'RankingWorker',
        payload: {}, attempt: 1, error: 'Timeout', requestId: 'req-1'
      });
      expect(entry1.isPoisonMessage).toBe(false);

      const entry3 = dlqManager.recordFailure({
        eventId: 'evt-poison', eventType: 'VoteAdded', workerName: 'RankingWorker',
        payload: {}, attempt: 3, error: 'Still failing', requestId: 'req-1'
      });
      expect(entry3.isPoisonMessage).toBe(true);
      expect(dlqManager.getPoisonMessages().length).toBe(1);
    });

    it('should track shouldRetry correctly', () => {
      expect(dlqManager.shouldRetry('evt-new', 'RankingWorker')).toBe(true);

      dlqManager.recordFailure({
        eventId: 'evt-exhaust', eventType: 'VoteAdded', workerName: 'RankingWorker',
        payload: {}, attempt: 5, error: 'Done', requestId: 'req-1'
      });
      expect(dlqManager.shouldRetry('evt-exhaust', 'RankingWorker')).toBe(false);
    });
  });

  // ── Event Router ───────────────────────────────────────────────────

  describe('Event Router', () => {
    it('should route ConfessionCreated to PiiScanWorker', () => {
      const router = new EventRouter({ dlqManager });
      const routes = router.getRoutesForEvent('ConfessionCreated');
      expect(routes).toContain('PiiScanWorker');
    });

    it('should route VoteAdded to StatisticsWorker and RankingWorker', () => {
      const router = new EventRouter({ dlqManager });
      const routes = router.getRoutesForEvent('VoteAdded');
      expect(routes).toContain('StatisticsWorker');
      expect(routes).toContain('RankingWorker');
    });

    it('should route ReportSubmitted to ModerationWorker', () => {
      const router = new EventRouter({ dlqManager });
      const routes = router.getRoutesForEvent('ReportSubmitted');
      expect(routes).toContain('ModerationWorker');
    });

    it('should dispatch events to registered workers and log results', async () => {
      const router = new EventRouter({ dlqManager });
      const processed: string[] = [];

      router.registerWorker('StatisticsWorker', async (p) => { processed.push('stats-' + p['targetId']); });
      router.registerWorker('RankingWorker', async (p) => { processed.push('rank-' + p['targetId']); });

      await router.publish('VoteAdded', { eventId: 'evt-1', targetId: 'conf-1', collegeId: COLLEGE });

      expect(processed).toContain('stats-conf-1');
      expect(processed).toContain('rank-conf-1');
      expect(router.dispatchLog.length).toBe(2);
      expect(router.dispatchLog.every(l => l.success)).toBe(true);
    });

    it('should send failed worker dispatches to DLQ', async () => {
      const router = new EventRouter({ dlqManager });
      router.registerWorker('StatisticsWorker', async () => { throw new Error('DB_TIMEOUT'); });

      await router.publish('VoteAdded', { eventId: 'evt-fail', targetId: 'conf-1', collegeId: COLLEGE });

      const dlq = dlqManager.getDeadLetters();
      expect(dlq.length).toBe(1);
      expect(dlq[0]?.workerName).toBe('StatisticsWorker');
      expect(dlq[0]?.lastError).toBe('DB_TIMEOUT');
    });

    it('should enforce event-level idempotency — skip already-processed events', async () => {
      const router = new EventRouter({ dlqManager });
      let callCount = 0;
      router.registerWorker('StatisticsWorker', async () => { callCount++; });
      router.registerWorker('RankingWorker', async () => { callCount++; });

      await router.publish('VoteAdded', { eventId: 'evt-idem', targetId: 'conf-1', collegeId: COLLEGE });
      expect(callCount).toBe(2);

      await router.publish('VoteAdded', { eventId: 'evt-idem', targetId: 'conf-1', collegeId: COLLEGE });
      expect(callCount).toBe(2); // not called again
    });
  });

  // ── PII Scan Worker ────────────────────────────────────────────────

  describe('PII Scan Worker', () => {
    it('should detect phone numbers', () => {
      const result = scanForPii('Call me at 9876543210');
      expect(result.hasPii).toBe(true);
      expect(result.detectedTypes).toContain('PHONE_NUMBER');
    });

    it('should detect email addresses', () => {
      const result = scanForPii('Email me at student@stanford.edu');
      expect(result.hasPii).toBe(true);
      expect(result.detectedTypes).toContain('EMAIL');
    });

    it('should detect roll numbers', () => {
      const result = scanForPii('My roll is 21CS1045');
      expect(result.hasPii).toBe(true);
      expect(result.detectedTypes).toContain('ROLL_NUMBER');
    });

    it('should detect social handles', () => {
      const result = scanForPii('Find me @coolstudent123');
      expect(result.hasPii).toBe(true);
      expect(result.detectedTypes).toContain('SOCIAL_HANDLE');
    });

    it('should pass clean content', () => {
      const result = scanForPii('The campus food quality dropped this week.');
      expect(result.hasPii).toBe(false);
      expect(result.detectedTypes.length).toBe(0);
    });

    it('should quarantine confession on PII detection', async () => {
      let quarantined = false;
      let caseOpened = false;

      const result = await piiScanWorkerHandler(
        { confessionId: 'conf-1', collegeId: COLLEGE, title: 'Contact', content: 'Call 9876543210' },
        {
          quarantineConfession: async () => { quarantined = true; },
          openModerationCase: async () => { caseOpened = true; }
        }
      );

      expect(result.hasPii).toBe(true);
      expect(quarantined).toBe(true);
      expect(caseOpened).toBe(true);
    });
  });

  // ── Ranking Worker ─────────────────────────────────────────────────

  describe('Ranking Worker', () => {
    it('should calculate trending/hot/controversial scores', () => {
      const scores = calculateRankingScores({ upvotes: 50, comments: 20, reports: 2, ageHours: 4 });
      expect(parseFloat(scores.trendingScore)).toBeGreaterThan(0);
      expect(parseFloat(scores.hotScore)).toBeGreaterThan(0);
      expect(parseFloat(scores.controversialScore)).toBeGreaterThan(0);
    });

    it('should handle zero engagement gracefully', () => {
      const scores = calculateRankingScores({ upvotes: 0, comments: 0, reports: 0, ageHours: 1 });
      expect(scores.trendingScore).toBe('0.0000');
      expect(scores.hotScore).toBe('0.0000');
      expect(scores.controversialScore).toBe('0.0000');
    });

    it('should generate immutable ranking snapshot via worker handler', async () => {
      const statsRepo = new InMemoryStatisticsRepository();
      const rankingRepo = new InMemoryRankingRepository();

      const scores = await rankingWorkerHandler(
        { confessionId: 'conf-1', collegeId: COLLEGE, upvotes: 10, comments: 5, reports: 1, ageHours: 2 },
        {
          recalculateScores: async (id, college, metrics) => {
            await statsRepo.recalculateScores(id, college, { ...metrics, hotScore: metrics.hotScore });
          },
          saveSnapshot: async (snap) => { await rankingRepo.saveSnapshot(snap); }
        }
      );

      expect(parseFloat(scores.trendingScore)).toBeGreaterThan(0);
      expect(rankingRepo.snapshots.length).toBe(1);
      expect(rankingRepo.snapshots[0]?.snapshotType).toBe('INCREMENTAL');
    });
  });

  // ── Statistics Worker ──────────────────────────────────────────────

  describe('Statistics Worker', () => {
    it('should map VoteAdded to VOTE metric with delta +1', async () => {
      const statsRepo = new InMemoryStatisticsRepository();
      const result = await statisticsWorkerHandler(
        { eventType: 'VoteAdded', confessionId: 'conf-1', collegeId: COLLEGE },
        { incrementViews: async (id, c) => { await statsRepo.incrementViews(id, c); }, recalculateScores: async () => {} }
      );
      expect(result.metric).toBe('VOTE');
      expect(result.delta).toBe(1);
    });

    it('should map VoteRemoved to VOTE metric with delta -1', async () => {
      const statsRepo = new InMemoryStatisticsRepository();
      const result = await statisticsWorkerHandler(
        { eventType: 'VoteRemoved', confessionId: 'conf-1', collegeId: COLLEGE },
        { incrementViews: async (id, c) => { await statsRepo.incrementViews(id, c); }, recalculateScores: async () => {} }
      );
      expect(result.metric).toBe('VOTE');
      expect(result.delta).toBe(-1);
    });

    it('should map CommentAdded to COMMENT metric', async () => {
      const result = await statisticsWorkerHandler(
        { eventType: 'CommentAdded', confessionId: 'conf-1', collegeId: COLLEGE },
        { incrementViews: async () => {}, recalculateScores: async () => {} }
      );
      expect(result.metric).toBe('COMMENT');
    });

    it('should map ReportSubmitted to REPORT metric', async () => {
      const result = await statisticsWorkerHandler(
        { eventType: 'ReportSubmitted', confessionId: 'conf-1', collegeId: COLLEGE },
        { incrementViews: async () => {}, recalculateScores: async () => {} }
      );
      expect(result.metric).toBe('REPORT');
    });
  });

  // ── Search Indexer Worker ──────────────────────────────────────────

  describe('Search Indexer Worker', () => {
    it('should INDEX on ConfessionPublished', async () => {
      let indexed = false;
      const result = await searchIndexerWorkerHandler(
        { eventType: 'ConfessionPublished', confessionId: 'conf-1', collegeId: COLLEGE },
        { indexConfession: async () => { indexed = true; }, removeFromIndex: async () => {} }
      );
      expect(result.action).toBe('INDEX');
      expect(indexed).toBe(true);
    });

    it('should REMOVE on ConfessionDeleted', async () => {
      let removed = false;
      const result = await searchIndexerWorkerHandler(
        { eventType: 'ConfessionDeleted', confessionId: 'conf-1', collegeId: COLLEGE },
        { indexConfession: async () => {}, removeFromIndex: async () => { removed = true; } }
      );
      expect(result.action).toBe('REMOVE');
      expect(removed).toBe(true);
    });
  });

  // ── Notification Worker ────────────────────────────────────────────

  describe('Notification Worker', () => {
    it('should prepare NEW_CONFESSION notification payload', async () => {
      const notifRepo = new InMemoryNotificationRepository();
      const result = await notificationWorkerHandler(
        { eventType: 'ConfessionPublished', confessionId: 'conf-1', collegeId: COLLEGE },
        { queueNotification: async (n) => { await notifRepo.queueNotification(n); } }
      );
      expect(result.notificationType).toBe('NEW_CONFESSION');
      expect(notifRepo.notifications.length).toBe(1);
    });

    it('should route ModerationCaseOpened to MODERATORS recipient', async () => {
      const notifRepo = new InMemoryNotificationRepository();
      const result = await notificationWorkerHandler(
        { eventType: 'ModerationCaseOpened', confessionId: 'conf-1', collegeId: COLLEGE },
        { queueNotification: async (n) => { await notifRepo.queueNotification(n); } }
      );
      expect(result.recipientUserId).toBe('MODERATORS');
      expect(result.notificationType).toBe('MODERATION_ALERT');
    });
  });

  // ── Moderation Worker ──────────────────────────────────────────────

  describe('Moderation Worker', () => {
    it('should NOT quarantine below threshold (< 3 reports)', async () => {
      const result = await moderationWorkerHandler(
        { confessionId: 'conf-1', collegeId: COLLEGE, reasonCode: 'SPAM' },
        {
          getReportCount: async () => 2,
          quarantineConfession: async () => {},
          openModerationCase: async () => {}
        }
      );
      expect(result.action).toBe('THRESHOLD_NOT_REACHED');
    });

    it('should quarantine and open case at threshold (>= 3 reports)', async () => {
      let quarantined = false;
      let caseOpened = false;

      const result = await moderationWorkerHandler(
        { confessionId: 'conf-1', collegeId: COLLEGE, reasonCode: 'HARASSMENT' },
        {
          getReportCount: async () => 3,
          quarantineConfession: async () => { quarantined = true; },
          openModerationCase: async () => { caseOpened = true; }
        }
      );
      expect(result.action).toBe('CASE_OPENED');
      expect(result.severityLevel).toBe(1); // HARASSMENT = severity 1
      expect(quarantined).toBe(true);
      expect(caseOpened).toBe(true);
    });
  });

  // ── Cleanup Worker ─────────────────────────────────────────────────

  describe('Cleanup Worker', () => {
    it('should execute all cleanup tasks and return counts', async () => {
      const result = await cleanupWorkerHandler(
        { collegeId: COLLEGE },
        {
          deleteExpiredNotifications: async () => 15,
          pruneOldSnapshots: async () => 8,
          cleanTemporaryFiles: async () => 3
        }
      );
      expect(result.expiredNotifications).toBe(15);
      expect(result.oldSnapshots).toBe(8);
      expect(result.temporaryFiles).toBe(3);
    });
  });

  // ── Full Pipeline Integration ──────────────────────────────────────

  describe('Full Pipeline Integration', () => {
    it('should route ConfessionCreated → PiiScan → (clean) → publish ConfessionPublished → fanout', async () => {
      const router = new EventRouter({ dlqManager });
      const pipelineLog: string[] = [];

      router.registerWorker('PiiScanWorker', async (p) => {
        const content = (p['content'] as string) || '';
        const result = scanForPii(content);
        pipelineLog.push(`pii-scan:${result.hasPii ? 'FAIL' : 'PASS'}`);
        if (!result.hasPii) {
          // Clean — publish ConfessionPublished to continue pipeline
          await router.publish('ConfessionPublished', { ...p, eventId: `evt-pub-${Date.now()}`, eventType: 'ConfessionPublished' });
        }
      });
      router.registerWorker('SearchIndexerWorker', async () => { pipelineLog.push('search-indexed'); });
      router.registerWorker('RankingWorker', async () => { pipelineLog.push('ranking-updated'); });
      router.registerWorker('NotificationWorker', async () => { pipelineLog.push('notification-queued'); });

      await router.publish('ConfessionCreated', {
        eventId: 'evt-create-1',
        confessionId: 'conf-1',
        collegeId: COLLEGE,
        content: 'Campus food quality dropped this week.'
      });

      expect(pipelineLog).toContain('pii-scan:PASS');
      expect(pipelineLog).toContain('search-indexed');
      expect(pipelineLog).toContain('ranking-updated');
      expect(pipelineLog).toContain('notification-queued');
    });

    it('should halt pipeline when PII is detected', async () => {
      const router = new EventRouter({ dlqManager });
      const pipelineLog: string[] = [];

      router.registerWorker('PiiScanWorker', async (p) => {
        const content = (p['content'] as string) || '';
        const result = scanForPii(content);
        pipelineLog.push(`pii-scan:${result.hasPii ? 'FAIL' : 'PASS'}`);
        // PII found — do NOT publish ConfessionPublished
      });
      router.registerWorker('SearchIndexerWorker', async () => { pipelineLog.push('search-indexed'); });

      await router.publish('ConfessionCreated', {
        eventId: 'evt-create-pii',
        confessionId: 'conf-2',
        collegeId: COLLEGE,
        content: 'Contact me at student@campus.edu for details'
      });

      expect(pipelineLog).toContain('pii-scan:FAIL');
      expect(pipelineLog).not.toContain('search-indexed');
    });
  });
});
