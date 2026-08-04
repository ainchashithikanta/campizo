/**
 * Campus Connect — Reusable Domain Invariant Assertions
 * Prevents illegal state mutations and validates entity boundary rules.
 */

import {
  InvalidConversationContextError,
  IllegalStateTransitionError,
  PrivacyViolationError,
  OptimisticLockingError
} from '../errors/domain-errors.js';

export function assertMandatoryConversationContext(
  contextType: string | null | undefined,
  contextId: string | null | undefined
): void {
  if (!contextType || !contextType.trim() || !contextId || !contextId.trim()) {
    throw new InvalidConversationContextError();
  }
}

export function assertValidStateTransition(
  entityName: string,
  currentState: string,
  targetState: string,
  allowedTransitions: Record<string, string[]>
): void {
  const allowed = allowedTransitions[currentState] || [];
  if (!allowed.includes(targetState)) {
    throw new IllegalStateTransitionError(entityName, currentState, targetState);
  }
}

export function assertPrivacyScopePermitted(
  visibilityScope: string,
  requesterCollegeId: string,
  targetCollegeId: string,
  isFriend: boolean
): void {
  if (visibilityScope === 'HIDDEN') {
    throw new PrivacyViolationError('Target student profile is hidden from discovery.');
  }
  if (visibilityScope === 'FRIENDS_ONLY' && !isFriend) {
    throw new PrivacyViolationError('Target student profile is accessible to friends only.');
  }
  if (requesterCollegeId !== targetCollegeId) {
    throw new PrivacyViolationError('Cross-college profile discovery is restricted.');
  }
}

export function assertOptimisticLockingVersion(
  entityName: string,
  expectedVersion: number,
  actualVersion: number
): void {
  if (expectedVersion !== actualVersion) {
    throw new OptimisticLockingError(entityName, expectedVersion, actualVersion);
  }
}
