import { describe, it, expect } from 'vitest';
import {
  confessions,
  confessionComments,
  anonymousThreadIdentities,
  moderationCases,
  confessionCategories,
  confessionStatistics,
  confessionMedia,
  assertSameCollege,
  assertThreadIdentityImmutable,
  assertAnonymousIdentityAccess,
  assertNoSelfVote,
  assertCommentDepth,
  assertValidStateTransition,
  assertSingleVote,
  assertSingleBookmark,
  assertDuplicateReport,
  formatSoftDeletedComment,
  CrossCollegeAccessError,
  IdentityAccessDeniedError,
  SelfVoteError,
  DuplicateVoteError,
  DuplicateBookmarkError,
  DuplicateReportError,
  ThreadDepthExceededError,
  InvalidStateTransitionError
} from '../src/index.js';

describe('Campus Confessions Domain & Database Layer', () => {
  it('should export all 17 Drizzle ORM tables with mandatory college_id tenant column', () => {
    expect(confessions).toBeDefined();
    expect(confessionComments).toBeDefined();
    expect(anonymousThreadIdentities).toBeDefined();
    expect(moderationCases).toBeDefined();
    expect(confessionCategories).toBeDefined();
    expect(confessionStatistics).toBeDefined();
    expect(confessionMedia).toBeDefined();

    expect(confessions.collegeId).toBeDefined();
    expect(confessionComments.collegeId).toBeDefined();
    expect(anonymousThreadIdentities.collegeId).toBeDefined();
  });

  it('should enforce tenant isolation invariant via assertSameCollege', () => {
    expect(() => assertSameCollege('college-stanford-001', 'college-stanford-001')).not.toThrow();
    expect(() => assertSameCollege('college-stanford-001', 'college-mit-002')).toThrow(CrossCollegeAccessError);
  });

  it('should enforce Anonymous Identity Service security boundary', () => {
    expect(() => assertAnonymousIdentityAccess('IDENTITY_SERVICE')).not.toThrow();
    expect(() => assertAnonymousIdentityAccess('MODERATOR')).toThrow(IdentityAccessDeniedError);
    expect(() => assertAnonymousIdentityAccess('STUDENT')).toThrow(IdentityAccessDeniedError);
  });

  it('should enforce immutable thread pseudonym invariant', () => {
    expect(() => assertThreadIdentityImmutable('Curious Panda #402', 'Curious Panda #402')).not.toThrow();
    expect(() => assertThreadIdentityImmutable('Curious Panda #402', 'Witty Owl #108')).toThrow(
      InvalidStateTransitionError
    );
  });

  it('should prohibit self-voting via assertNoSelfVote', () => {
    expect(() => assertNoSelfVote('user-author-1', 'user-voter-2')).not.toThrow();
    expect(() => assertNoSelfVote('user-author-1', 'user-author-1')).toThrow(SelfVoteError);
  });

  it('should enforce comment tree nesting depth bounds', () => {
    expect(() => assertCommentDepth(5, 8)).not.toThrow();
    expect(() => assertCommentDepth(9, 8)).toThrow(ThreadDepthExceededError);
  });

  it('should validate legal state transitions for confessions', () => {
    expect(() => assertValidStateTransition('DRAFT', 'PUBLISHED')).not.toThrow();
    expect(() => assertValidStateTransition('PUBLISHED', 'QUARANTINED')).not.toThrow();
    expect(() => assertValidStateTransition('QUARANTINED', 'PUBLISHED')).not.toThrow();
    expect(() => assertValidStateTransition('DELETED', 'PUBLISHED')).toThrow(InvalidStateTransitionError);
  });

  it('should prevent duplicate voting, duplicate bookmarks, and duplicate reports', () => {
    expect(() => assertSingleVote(null, 'post-1')).not.toThrow();
    expect(() => assertSingleVote({ voteType: 'UPVOTE' }, 'post-1')).toThrow(DuplicateVoteError);

    expect(() => assertSingleBookmark(null, 'post-1')).not.toThrow();
    expect(() => assertSingleBookmark({ id: 'bm-1' }, 'post-1')).toThrow(DuplicateBookmarkError);

    expect(() => assertDuplicateReport(null, 'post-1')).not.toThrow();
    expect(() => assertDuplicateReport({ id: 'rep-1' }, 'post-1')).toThrow(DuplicateReportError);
  });

  it('should format soft-deleted comment placeholder text', () => {
    const text = formatSoftDeletedComment();
    expect(text).toBe('[Comment removed by moderation]');
  });
});
