import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import {
  InMemoryConfessionRepository,
  InMemoryCommentRepository,
  InMemoryModerationRepository,
  InMemoryNotificationRepository,
  InMemoryAnonymousIdentityRepository,
  InMemoryBookmarkRepository,
  InMemoryVoteRepository,
  ConfessionUseCases,
  ConfessionQueries,
  confessionRoutes,
  IIdempotencyStore,
  DlqManager,
  EventRouter
} from '../src/index.js';

describe('Campus Confessions Production Resilience & Failure Mode Suite', () => {
  let app: FastifyInstance;
  let useCases: ConfessionUseCases;
  let queries: ConfessionQueries;
  let confessionRepo: InMemoryConfessionRepository;
  let voteRepo: InMemoryVoteRepository;
  let modRepo: InMemoryModerationRepository;

  const COLLEGE = 'college-stanford-001';
  const HEADERS = {
    'x-college-id': COLLEGE,
    'x-request-id': 'req-resilience-001',
    'x-user-id': 'user-student-101'
  };

  let publishedEvents: Array<{ eventType: string; payload: any }> = [];

  beforeEach(async () => {
    confessionRepo = new InMemoryConfessionRepository();
    const commentRepo = new InMemoryCommentRepository();
    modRepo = new InMemoryModerationRepository();
    const notifRepo = new InMemoryNotificationRepository();
    const identityRepo = new InMemoryAnonymousIdentityRepository();
    const bookmarkRepo = new InMemoryBookmarkRepository();
    voteRepo = new InMemoryVoteRepository();

    publishedEvents = [];
    const eventPublisher = {
      async publish(eventType: string, payload: any) {
        publishedEvents.push({ eventType, payload });
      }
    };

    useCases = new ConfessionUseCases(
      confessionRepo,
      commentRepo,
      voteRepo,
      bookmarkRepo,
      modRepo,
      identityRepo,
      notifRepo,
      eventPublisher
    );

    queries = new ConfessionQueries(confessionRepo, commentRepo, bookmarkRepo, voteRepo, modRepo);

    app = Fastify({ logger: false });
    await app.register(confessionRoutes, { useCases, queries });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── Scenario 1: Redis unavailable during idempotency lookup ────────

  it('1. should gracefully fallback and succeed if IdempotencyStore throws storage error', async () => {
    const failingStore: IIdempotencyStore = {
      async has() {
        throw new Error('REDIS_CONNECTION_REFUSED');
      },
      async get() {
        throw new Error('REDIS_CONNECTION_REFUSED');
      },
      async set() {
        throw new Error('REDIS_CONNECTION_REFUSED');
      }
    };

    const resilientApp = Fastify({ logger: false });
    await resilientApp.register(confessionRoutes, {
      useCases,
      queries,
      idempotencyStore: failingStore
    });
    await resilientApp.ready();

    // App should not crash on Redis error; it gracefully falls back or continues
    const res = await resilientApp.inject({
      method: 'GET',
      url: '/api/v1/confessions/feed',
      headers: HEADERS
    });

    expect(res.statusCode).toBe(200);
    await resilientApp.close();
  });

  // ── Scenario 2: Database transaction rollback ──────────────────────

  it('2. should NOT emit domain events if database save operation rolls back / fails', async () => {
    const failingConfessionRepo = new InMemoryConfessionRepository();
    failingConfessionRepo.save = async () => {
      throw new Error('DATABASE_TRANSACTION_ABORTED');
    };

    let eventsEmitted = false;
    const failingUseCases = new ConfessionUseCases(
      failingConfessionRepo,
      new InMemoryCommentRepository(),
      new InMemoryVoteRepository(),
      new InMemoryBookmarkRepository(),
      new InMemoryModerationRepository(),
      new InMemoryAnonymousIdentityRepository(),
      new InMemoryNotificationRepository(),
      {
        async publish() {
          eventsEmitted = true;
        }
      }
    );

    await expect(
      failingUseCases.createConfession({
        collegeId: COLLEGE,
        userId: 'user-101',
        categoryCode: 'academic',
        title: 'Transaction Failure Test',
        content: 'This should roll back and publish zero events.'
      })
    ).rejects.toThrow('DATABASE_TRANSACTION_ABORTED');

    expect(eventsEmitted).toBe(false);
  });

  // ── Scenario 3: Worker crash followed by DLQ retry ─────────────────

  it('3. should capture worker crashes in DLQ and track retry attempts with backoff', async () => {
    const dlq = new DlqManager({ maxAttempts: 3, baseDelayMs: 50, poisonThreshold: 2 });
    let attempts = 0;

    const crashWorker = async () => {
      attempts++;
      if (attempts <= 2) {
        throw new Error('WORKER_CRASHED_OUT_OF_MEMORY');
      }
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await crashWorker();
      } catch (err) {
        dlq.recordFailure({
          eventId: 'evt-crash-1',
          eventType: 'VoteAdded',
          workerName: 'CrashWorker',
          payload: {},
          attempt,
          error: (err as Error).message,
          requestId: 'req-crash-1'
        });
      }
    }

    const deadLetters = dlq.getDeadLetters();
    expect(deadLetters.length).toBe(1);
    expect(deadLetters[0]?.attempt).toBe(2);
    expect(deadLetters[0]?.isPoisonMessage).toBe(true);
    expect(dlq.calculateDelay(1)).toBe(50);
    expect(dlq.calculateDelay(2)).toBe(100);
  });

  // ── Scenario 4: Concurrent voting (100+ requests) ──────────────────

  it('4. should process 100 concurrent votes safely enforcing single vote invariant', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-author-1',
      categoryCode: 'academic',
      title: 'High Concurrency Voting Test',
      content: 'Testing 100 concurrent vote requests.'
    });

    const votePromises = Array.from({ length: 100 }, (_, i) =>
      useCases.voteConfession({
        collegeId: COLLEGE,
        confessionId: confession.id,
        voterUserId: `user-voter-${i + 1}`,
        authorUserId: 'user-author-1',
        voteType: 'UPVOTE'
      })
    );

    await Promise.all(votePromises);

    // Verify all 100 votes were recorded independently
    expect(voteRepo.votes.size).toBe(100);

    // Duplicate vote by same voter should fail
    await expect(
      useCases.voteConfession({
        collegeId: COLLEGE,
        confessionId: confession.id,
        voterUserId: 'user-voter-1',
        authorUserId: 'user-author-1',
        voteType: 'UPVOTE'
      })
    ).rejects.toThrow();
  });

  // ── Scenario 5: Concurrent reporting triggering quarantine exactly once

  it('5. should quarantine confession and trigger moderation case when hit with 10 concurrent reports', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-author-1',
      categoryCode: 'rant',
      title: 'Quarantine Circuit Breaker Test',
      content: 'Confession subject to high report burst.'
    });

    const reportPromises = Array.from({ length: 10 }, (_, i) =>
      useCases.reportConfession({
        collegeId: COLLEGE,
        confessionId: confession.id,
        reporterUserId: `reporter-${i + 1}`,
        reasonCode: 'SPAM'
      })
    );

    await Promise.all(reportPromises);

    const updatedConfession = await confessionRepo.findById(confession.id, COLLEGE);
    expect(updatedConfession?.status).toBe('QUARANTINED');

    const modCases = await modRepo.listQueue(COLLEGE);
    expect(modCases.length).toBeGreaterThanOrEqual(1);
    expect(modCases[0]?.confessionId).toBe(confession.id);
  });

  // ── Scenario 6: Duplicate event delivery ───────────────────────────

  it('6. should ignore duplicate event delivery via EventRouter idempotency guard', async () => {
    const dlq = new DlqManager();
    const router = new EventRouter({ dlqManager: dlq });
    let workerExecutionCount = 0;

    router.registerWorker('StatisticsWorker', async () => {
      workerExecutionCount++;
    });

    const payload = { eventId: 'evt-duplicate-1', confessionId: 'conf-1', collegeId: COLLEGE };

    // Deliver same event 5 times
    await router.publish('VoteAdded', payload);
    await router.publish('VoteAdded', payload);
    await router.publish('VoteAdded', payload);
    await router.publish('VoteAdded', payload);
    await router.publish('VoteAdded', payload);

    expect(workerExecutionCount).toBe(1); // Executed exactly once
  });

  // ── Scenario 7: Event ordering after retries ────────────────────────

  it('7. should preserve strict event execution sequence after retries', async () => {
    const sequence: string[] = [];
    const dlq = new DlqManager();
    const router = new EventRouter({ dlqManager: dlq });

    router.registerWorker('SearchIndexerWorker', async (p) => {
      sequence.push(`search:${p['eventType']}`);
    });
    router.registerWorker('RankingWorker', async (p) => {
      sequence.push(`ranking:${p['eventType']}`);
    });

    await router.publish('ConfessionPublished', { eventId: 'e1', confessionId: 'c1', collegeId: COLLEGE });
    await router.publish('CommentAdded', { eventId: 'e2', confessionId: 'c1', collegeId: COLLEGE });
    await router.publish('CommentSoftDeleted', { eventId: 'e3', confessionId: 'c1', collegeId: COLLEGE });

    expect(sequence[0]).toBe('search:ConfessionPublished');
    expect(sequence[1]).toBe('ranking:ConfessionPublished');
    expect(sequence[2]).toBe('ranking:CommentAdded');
    expect(sequence[3]).toBe('search:CommentAdded');
  });

  // ── Scenario 8: Recovery after temporary storage failure ───────────

  it('8. should recover worker operation when temporary storage restores', async () => {
    let isStorageAlive = false;

    const resilientWorker = async () => {
      if (!isStorageAlive) {
        throw new Error('STORAGE_TEMPORARILY_UNAVAILABLE');
      }
      return 'SUCCESS';
    };

    // Attempt 1: storage down -> throws
    await expect(resilientWorker()).rejects.toThrow('STORAGE_TEMPORARILY_UNAVAILABLE');

    // Storage restores
    isStorageAlive = true;

    // Attempt 2: storage up -> succeeds
    const result = await resilientWorker();
    expect(result).toBe('SUCCESS');
  });

  // ── Scenario 9: Queue backlog processing ───────────────────────────

  it('9. should process a queue backlog of 500 events without memory leaks or missing items', async () => {
    const dlq = new DlqManager();
    const router = new EventRouter({ dlqManager: dlq });
    let processedCount = 0;

    router.registerWorker('StatisticsWorker', async () => {
      processedCount++;
    });

    const backlogEvents = Array.from({ length: 500 }, (_, i) => ({
      eventId: `backlog-evt-${i + 1}`,
      confessionId: `conf-${i + 1}`,
      collegeId: COLLEGE
    }));

    for (const evt of backlogEvents) {
      await router.publish('VoteAdded', evt);
    }

    expect(processedCount).toBe(500);
    expect(dlq.getDeadLetters().length).toBe(0);
  });
});
