import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBus } from '@college-hub/core';
import {
  StatsEngineWorker,
  SearchIndexerWorker,
  CacheInvalidationWorker,
  ModerationQueueWorker,
  DeadLetterQueueManager,
  RateMyProfessorEventRouter
} from '../src/index.js';

class MockProfRepo {
  private profs = new Map<string, any>();

  constructor() {
    this.profs.set('prof-101', {
      id: 'prof-101',
      collegeId: 'college-stanford-001',
      departmentId: 'dept-cs-001',
      fullName: 'Dr. Alan Turing',
      slug: 'dr-alan-turing',
      designation: 'Professor',
      status: 'ACTIVE'
    });
  }

  async findById(id: string, collegeId: string) {
    const p = this.profs.get(id);
    return p && p.collegeId === collegeId ? p : null;
  }
}

class MockReviewRepo {
  private reviews = new Map<string, any>();

  constructor() {
    this.reviews.set('rev-1', {
      id: 'rev-1',
      collegeId: 'college-stanford-001',
      professorId: 'prof-101',
      reviewText: 'Excellent professor! Very clear explanations.',
      overallRating: 5.0,
      moderationStatus: 'APPROVED'
    });
    this.reviews.set('rev-2', {
      id: 'rev-2',
      collegeId: 'college-stanford-001',
      professorId: 'prof-101',
      reviewText: 'Great teaching style.',
      overallRating: 4.0,
      moderationStatus: 'APPROVED'
    });
  }

  async findById(id: string, collegeId: string) {
    const r = this.reviews.get(id);
    return r && r.collegeId === collegeId ? r : null;
  }

  async findByProfessorId(professorId: string, collegeId: string) {
    return Array.from(this.reviews.values()).filter(
      (r) => r.professorId === professorId && r.collegeId === collegeId
    );
  }

  async save(review: any) {
    this.reviews.set(review.id, review);
    return review;
  }
}

class MockStatsRepo {
  private stats = new Map<string, any>();

  async findByProfessorId(professorId: string, collegeId: string) {
    return this.stats.get(`${collegeId}:${professorId}`) || null;
  }

  async save(stats: any) {
    this.stats.set(`${stats.collegeId}:${stats.professorId}`, stats);
    return stats;
  }
}

describe('MS-18.8.4 — Background Workers, Statistics Engine, Search Indexing & DLQ Test Suite', () => {
  let eventBus: InMemoryEventBus;
  let profRepo: MockProfRepo;
  let reviewRepo: MockReviewRepo;
  let statsRepo: MockStatsRepo;
  let statsWorker: StatsEngineWorker;
  let searchWorker: SearchIndexerWorker;
  let cacheWorker: CacheInvalidationWorker;
  let modWorker: ModerationQueueWorker;
  let dlqManager: DeadLetterQueueManager;
  let eventRouter: RateMyProfessorEventRouter;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
    profRepo = new MockProfRepo();
    reviewRepo = new MockReviewRepo();
    statsRepo = new MockStatsRepo();

    statsWorker = new StatsEngineWorker(reviewRepo as any, statsRepo as any, eventBus);
    searchWorker = new SearchIndexerWorker(profRepo as any);
    cacheWorker = new CacheInvalidationWorker();
    modWorker = new ModerationQueueWorker(reviewRepo as any, eventBus);

    eventRouter = new RateMyProfessorEventRouter(
      eventBus,
      statsWorker,
      searchWorker,
      cacheWorker,
      modWorker
    );
    eventRouter.registerSubscriptions();
  });

  it('1. Statistics Engine — should calculate Bayesian weighted rating and distribution asynchronously', async () => {
    const stats = await statsWorker.recalculateForProfessor('prof-101', 'college-stanford-001');

    expect(stats.totalReviewsCount).toBe(2);
    expect(stats.rawAverageRating).toBe(4.5); // (5 + 4) / 2
    expect(stats.recommendationPercentage).toBe(100.0);
    expect(stats.bayesianRating).toBeGreaterThan(3.5); // Prior weighted score
    expect(stats.star5Count).toBe(1);
    expect(stats.star4Count).toBe(1);
  });

  it('2. Search Indexer — should index professor tokens and perform fuzzy search matching', async () => {
    const doc = await searchWorker.indexProfessor('prof-101', 'college-stanford-001');
    expect(doc).not.toBeNull();
    expect(doc?.fullName).toBe('Dr. Alan Turing');

    const results = searchWorker.searchIndexQuery('college-stanford-001', 'turing');
    expect(results.length).toBe(1);
    expect(results[0].fullName).toBe('Dr. Alan Turing');
  });

  it('3. Cache Invalidation — should invalidate targeted cache keys on professor update', () => {
    const keys = cacheWorker.invalidateProfessorCache('college-stanford-001', 'dr-alan-turing', 'prof-101');

    expect(keys).toContain('college:college-stanford-001:prof:dr-alan-turing');
    expect(keys).toContain('college:college-stanford-001:prof:dr-alan-turing:stats');
    expect(keys).toContain('college:college-stanford-001:prof:prof-101:reviews');
  });

  it('4. Pre-Moderation Risk Scanner — should auto-approve clean review and flag suspicious review', async () => {
    // Clean review
    await reviewRepo.save({
      id: 'rev-clean',
      collegeId: 'college-stanford-001',
      professorId: 'prof-101',
      reviewText: 'This professor is outstanding and explains complex algorithms clearly.',
      overallRating: 5.0,
      moderationStatus: 'PENDING_MODERATION'
    });

    const cleanResult = await modWorker.evaluateReviewRisk('rev-clean', 'college-stanford-001');
    expect(cleanResult.isAutoApproved).toBe(true);

    // Suspicious review with profanity and phone number
    await reviewRepo.save({
      id: 'rev-flagged',
      collegeId: 'college-stanford-001',
      professorId: 'prof-101',
      reviewText: 'Call me at 555-123-4567, this class was total crap and bitching',
      overallRating: 1.0,
      moderationStatus: 'PENDING_MODERATION'
    });

    const flaggedResult = await modWorker.evaluateReviewRisk('rev-flagged', 'college-stanford-001');
    expect(flaggedResult.isAutoApproved).toBe(false);
    expect(flaggedResult.flaggedReasons.length).toBeGreaterThan(0);
  });

  it('5. Dead Letter Queue & Retry Manager — should retry failed execution and push to DLQ on repeated failure', async () => {
    dlqManager = new DeadLetterQueueManager();
    let attempts = 0;

    const success = await dlqManager.executeWithRetry(
      'evt-test-fail-101',
      'TestFailedEvent',
      'college-stanford-001',
      { data: 123 },
      async () => {
        attempts++;
        throw new Error('Database connection timeout error');
      },
      3
    );

    expect(success).toBe(false);
    expect(attempts).toBe(3);

    const dlqItems = dlqManager.getDLQItems();
    expect(dlqItems.length).toBe(1);
    expect(dlqItems[0].eventId).toBe('evt-test-fail-101');
    expect(dlqItems[0].error).toContain('Database connection timeout error');
  });

  it('6. Idempotency Tracking — should skip duplicate event processing', async () => {
    dlqManager = new DeadLetterQueueManager();
    let callCount = 0;

    const task = async () => {
      callCount++;
    };

    // First call
    await dlqManager.executeWithRetry('evt-idempotent-001', 'ReviewPublished', 'college-stanford-001', {}, task);
    expect(callCount).toBe(1);

    // Second duplicate call
    await dlqManager.executeWithRetry('evt-idempotent-001', 'ReviewPublished', 'college-stanford-001', {}, task);
    expect(callCount).toBe(1); // Call count should remain 1 due to idempotency check
  });
});
