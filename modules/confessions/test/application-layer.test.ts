import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryConfessionRepository,
  InMemoryCommentRepository,
  InMemoryModerationRepository,
  InMemoryStatisticsRepository,
  InMemoryNotificationRepository,
  InMemoryAnonymousIdentityRepository,
  InMemoryRankingRepository,
  InMemoryBookmarkRepository,
  InMemoryVoteRepository,
  InMemoryMediaRepository,
  ConfessionUseCases,
  ConfessionQueries,
  SelfVoteError,
  DuplicateBookmarkError,
  ThreadDepthExceededError
} from '../src/index.js';

describe('Campus Confessions Application Services & CQRS Suite', () => {
  let confessionRepo: InMemoryConfessionRepository;
  let commentRepo: InMemoryCommentRepository;
  let modRepo: InMemoryModerationRepository;
  let statsRepo: InMemoryStatisticsRepository;
  let notifRepo: InMemoryNotificationRepository;
  let identityRepo: InMemoryAnonymousIdentityRepository;
  let rankingRepo: InMemoryRankingRepository;
  let bookmarkRepo: InMemoryBookmarkRepository;
  let voteRepo: InMemoryVoteRepository;
  let mediaRepo: InMemoryMediaRepository;

  let publishedEvents: Array<{ eventType: string; payload: any }> = [];
  let eventPublisher = {
    async publish(eventType: string, payload: any) {
      publishedEvents.push({ eventType, payload });
    }
  };

  let useCases: ConfessionUseCases;
  let queries: ConfessionQueries;

  const COLLEGE = 'college-stanford-001';

  beforeEach(() => {
    confessionRepo = new InMemoryConfessionRepository();
    commentRepo = new InMemoryCommentRepository();
    modRepo = new InMemoryModerationRepository();
    statsRepo = new InMemoryStatisticsRepository();
    notifRepo = new InMemoryNotificationRepository();
    identityRepo = new InMemoryAnonymousIdentityRepository();
    rankingRepo = new InMemoryRankingRepository();
    bookmarkRepo = new InMemoryBookmarkRepository();
    voteRepo = new InMemoryVoteRepository();
    mediaRepo = new InMemoryMediaRepository();

    publishedEvents = [];

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

    queries = new ConfessionQueries(
      confessionRepo,
      commentRepo,
      bookmarkRepo,
      voteRepo,
      modRepo
    );
  });

  it('should publish a new confession and emit ConfessionPublished domain event', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-student-101',
      categoryCode: 'academic',
      title: 'Is 3rd-year OS lab grading overly strict?',
      content: 'The rubric seems scaled down compared to last semester...'
    });

    expect(confession.id).toBeDefined();
    expect(confession.status).toBe('PUBLISHED');
    expect(publishedEvents.length).toBe(1);
    expect(publishedEvents[0]?.eventType).toBe('ConfessionPublished');
  });

  it('should enforce thread pseudonym immutability (same thread -> same pseudonym)', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-student-101',
      categoryCode: 'academic',
      title: 'OS Lab Exam',
      content: 'Need tips for sync problems.'
    });

    const pseud1 = await identityRepo.findOrCreatePseudonym(confession.id, 'hash-user-student-101', COLLEGE);
    const pseud2 = await identityRepo.findOrCreatePseudonym(confession.id, 'hash-user-student-101', COLLEGE);

    expect(pseud1).toBe(pseud2);
  });

  it('should add a nested comment and enforce comment depth bounds', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-student-101',
      categoryCode: 'academic',
      title: 'OS Lab Exam',
      content: 'Need tips.'
    });

    const comment = await useCases.addComment({
      collegeId: COLLEGE,
      confessionId: confession.id,
      userId: 'user-student-202',
      content: 'Focus on Semaphore mutex problems!'
    });

    expect(comment.id).toBeDefined();
    expect(comment.depth).toBe(1);

    // Simulate exceeding max depth (depth 9 > 8)
    commentRepo.commentsMap.set('deep-comment', {
      id: 'deep-comment',
      collegeId: COLLEGE,
      confessionId: confession.id,
      rootCommentId: null,
      parentCommentId: null,
      depth: 8,
      authorThreadPseudonym: 'Witty Owl #108',
      content: 'Level 8 comment',
      status: 'ACTIVE',
      upvotesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(
      useCases.addComment({
        collegeId: COLLEGE,
        confessionId: confession.id,
        userId: 'user-student-303',
        content: 'Too deep reply',
        parentCommentId: 'deep-comment'
      })
    ).rejects.toThrow(ThreadDepthExceededError);
  });

  it('should prohibit self-voting via SelfVoteError', async () => {
    await expect(
      useCases.voteConfession({
        collegeId: COLLEGE,
        confessionId: 'conf-1',
        voterUserId: 'user-author-1',
        authorUserId: 'user-author-1',
        voteType: 'UPVOTE'
      })
    ).rejects.toThrow(SelfVoteError);
  });

  it('should prevent duplicate bookmarks via DuplicateBookmarkError', async () => {
    await useCases.bookmarkConfession({
      collegeId: COLLEGE,
      confessionId: 'conf-1',
      userId: 'user-1'
    });

    await expect(
      useCases.bookmarkConfession({
        collegeId: COLLEGE,
        confessionId: 'conf-1',
        userId: 'user-1'
      })
    ).rejects.toThrow(DuplicateBookmarkError);
  });

  it('should trigger automated 3-report quarantine circuit breaker', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-author-1',
      categoryCode: 'rant',
      title: 'Hostel Mess Food Rant',
      content: 'Quality dropped significantly this week.'
    });

    await useCases.reportConfession({ collegeId: COLLEGE, confessionId: confession.id, reporterUserId: 'r1', reasonCode: 'SPAM' });
    await useCases.reportConfession({ collegeId: COLLEGE, confessionId: confession.id, reporterUserId: 'r2', reasonCode: 'SPAM' });
    await useCases.reportConfession({ collegeId: COLLEGE, confessionId: confession.id, reporterUserId: 'r3', reasonCode: 'SPAM' });

    const updated = await confessionRepo.findById(confession.id, COLLEGE);
    expect(updated?.status).toBe('QUARANTINED');

    const modCases = await modRepo.listQueue(COLLEGE);
    expect(modCases.length).toBe(1);
    expect(modCases[0]?.confessionId).toBe(confession.id);
  });

  it('should record moderation decision (RESTORE / DELETE) and update confession status', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-author-1',
      categoryCode: 'rant',
      title: 'Hostel Mess Food Rant',
      content: 'Quality dropped.'
    });

    const modCase = await modRepo.saveCase({
      collegeId: COLLEGE,
      confessionId: confession.id,
      severityLevel: 2,
      status: 'OPEN'
    });

    await useCases.recordModerationDecision({
      collegeId: COLLEGE,
      caseId: modCase.id,
      moderatorUserId: 'mod-user-1',
      action: 'RESTORE',
      reasonNote: 'False flag cleared.'
    });

    const restored = await confessionRepo.findById(confession.id, COLLEGE);
    expect(restored?.status).toBe('PUBLISHED');
  });

  it('should fetch composite confession detail read model in 1 request via CQRS queries', async () => {
    const confession = await useCases.createConfession({
      collegeId: COLLEGE,
      userId: 'user-author-1',
      categoryCode: 'academic',
      title: 'CASIO FX-991ES+ Usage',
      content: 'How to clear memory before exam?'
    });

    await useCases.addComment({
      collegeId: COLLEGE,
      confessionId: confession.id,
      userId: 'user-student-202',
      content: 'Press Shift + 9 + 3 + ='
    });

    const composite = await queries.getConfessionDetail(confession.id, COLLEGE, 'user-student-202');
    expect(composite).not.toBeNull();
    expect(composite?.confession.id).toBe(confession.id);
    expect(composite?.comments.length).toBe(1);
    expect(composite?.statistics.totalComments).toBe(1);
  });
});
