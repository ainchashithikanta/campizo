import {
  CrossCollegeAccessError,
  IdentityAccessDeniedError,
  SelfVoteError,
  DuplicateVoteError,
  DuplicateBookmarkError,
  DuplicateReportError,
  ThreadDepthExceededError,
  InvalidStateTransitionError
} from '../errors/domain-errors.js';

export function assertSameCollege(targetCollege: string, activeCollege: string): void {
  if (targetCollege !== activeCollege) {
    throw new CrossCollegeAccessError(targetCollege, activeCollege);
  }
}

export function assertThreadIdentityImmutable(existingPseudonym: string, requestedPseudonym: string): void {
  if (existingPseudonym !== requestedPseudonym) {
    throw new InvalidStateTransitionError(
      `Pseudonym ${existingPseudonym}`,
      `Pseudonym ${requestedPseudonym} (Immutable Invariant Violated)`
    );
  }
}

export function assertAnonymousIdentityAccess(callingRole: string): void {
  if (callingRole !== 'IDENTITY_SERVICE') {
    throw new IdentityAccessDeniedError();
  }
}

export function assertNoSelfVote(authorUserId: string, voterUserId: string): void {
  if (authorUserId === voterUserId) {
    throw new SelfVoteError();
  }
}

export function assertCommentDepth(currentDepth: number, maxDepth: number = 8): void {
  if (currentDepth > maxDepth) {
    throw new ThreadDepthExceededError(currentDepth, maxDepth);
  }
}

export function assertValidStateTransition(fromState: string, toState: string): void {
  const allowedTransitions: Record<string, string[]> = {
DRAFT: ['PENDING_APPROVAL', 'PUBLISHED', 'DELETED'],
  PENDING_APPROVAL: ['PUBLISHED', 'QUARANTINED', 'DELETED'],
  PUBLISHED: ['QUARANTINED', 'ARCHIVED', 'DELETED'],
    QUARANTINED: ['PUBLISHED', 'ARCHIVED', 'DELETED'],
    ARCHIVED: ['PUBLISHED', 'DELETED'],
    DELETED: []
  };

  const validTargets = allowedTransitions[fromState] || [];
  if (!validTargets.includes(toState)) {
    throw new InvalidStateTransitionError(fromState, toState);
  }
}

export function assertSingleVote(existingVote: unknown | null, targetId: string): void {
  if (existingVote) {
    throw new DuplicateVoteError(targetId);
  }
}

export function assertSingleBookmark(existingBookmark: unknown | null, confessionId: string): void {
  if (existingBookmark) {
    throw new DuplicateBookmarkError(confessionId);
  }
}

export function assertDuplicateReport(existingReport: unknown | null, confessionId: string): void {
  if (existingReport) {
    throw new DuplicateReportError(confessionId);
  }
}

export function formatSoftDeletedComment(): string {
  return '[Comment removed by moderation]';
}
