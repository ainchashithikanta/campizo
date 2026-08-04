export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CrossCollegeAccessError extends DomainError {
  constructor(requestedCollege: string, currentCollege: string) {
    super(
      `Cross-college access forbidden: requested ${requestedCollege}, active tenant is ${currentCollege}.`,
      'CROSS_COLLEGE_ACCESS_FORBIDDEN'
    );
  }
}

export class IdentityAccessDeniedError extends DomainError {
  constructor() {
    super(
      'Direct access to anonymous identity mapping table is forbidden by security policy.',
      'IDENTITY_ACCESS_DENIED'
    );
  }
}

export class SelfVoteError extends DomainError {
  constructor() {
    super('Students are prohibited from voting on their own confessions or comments.', 'SELF_VOTE_PROHIBITED');
  }
}

export class DuplicateVoteError extends DomainError {
  constructor(targetId: string) {
    super(`An active vote already exists for target ${targetId}.`, 'DUPLICATE_VOTE');
  }
}

export class DuplicateBookmarkError extends DomainError {
  constructor(confessionId: string) {
    super(`Confession ${confessionId} is already bookmarked by this student.`, 'DUPLICATE_BOOKMARK');
  }
}

export class DuplicateReportError extends DomainError {
  constructor(confessionId: string) {
    super(`You have already submitted a report for confession ${confessionId}.`, 'DUPLICATE_REPORT');
  }
}

export class ThreadDepthExceededError extends DomainError {
  constructor(currentDepth: number, maxDepth: number) {
    super(
      `Comment depth ${currentDepth} exceeds maximum allowed nesting depth of ${maxDepth}.`,
      'THREAD_DEPTH_EXCEEDED'
    );
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(fromState: string, toState: string) {
    super(`Illegal state transition from ${fromState} to ${toState}.`, 'INVALID_STATE_TRANSITION');
  }
}

export class ConfessionNotFoundError extends DomainError {
  constructor(confessionId: string) {
    super(`Confession with ID ${confessionId} was not found in current tenant scope.`, 'CONFESSION_NOT_FOUND');
  }
}

export class AnonymousIdentityUnavailableError extends DomainError {
  constructor(confessionId: string) {
    super(
      `Failed to assign or retrieve thread pseudonym for confession ${confessionId}.`,
      'ANONYMOUS_IDENTITY_UNAVAILABLE'
    );
  }
}

export class ModerationAccessDeniedError extends DomainError {
  constructor() {
    super('User does not hold required moderator permissions for this action.', 'MODERATION_ACCESS_DENIED');
  }
}
