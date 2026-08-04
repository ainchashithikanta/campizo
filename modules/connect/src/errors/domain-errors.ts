/**
 * Campus Connect — Typed Domain Error Classes
 * Enforces domain invariants and state transition rules.
 */

export abstract class CampusConnectDomainError extends Error {
  public readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DuplicateIntentError extends CampusConnectDomainError {
  constructor(intentType: string) {
    super(`Active intent of type '${intentType}' already exists for student.`, 'DUPLICATE_INTENT');
  }
}

export class IntentExpiredError extends CampusConnectDomainError {
  constructor(intentId: string) {
    super(`Student intent '${intentId}' has expired and cannot receive actions.`, 'INTENT_EXPIRED');
  }
}

export class PrivacyViolationError extends CampusConnectDomainError {
  constructor(reason: string) {
    super(`Privacy policy violation: ${reason}`, 'PRIVACY_VIOLATION');
  }
}

export class VisibilityViolationError extends CampusConnectDomainError {
  constructor(studentId: string, scope: string) {
    super(`Student '${studentId}' profile is restricted by visibility scope '${scope}'.`, 'VISIBILITY_VIOLATION');
  }
}

export class ConnectionBlockedError extends CampusConnectDomainError {
  constructor(studentId: string) {
    super(`Interaction with student '${studentId}' is blocked.`, 'CONNECTION_BLOCKED');
  }
}

export class AlreadyConnectedError extends CampusConnectDomainError {
  constructor(studentA: string, studentB: string) {
    super(`Students '${studentA}' and '${studentB}' are already connected.`, 'ALREADY_CONNECTED');
  }
}

export class InvalidConversationContextError extends CampusConnectDomainError {
  constructor() {
    super('Conversation creation requires a valid, non-null context (context_type and context_id).', 'INVALID_CONVERSATION_CONTEXT');
  }
}

export class RecommendationExpiredError extends CampusConnectDomainError {
  constructor(snapshotId: string) {
    super(`Recommendation snapshot '${snapshotId}' is expired or archived.`, 'RECOMMENDATION_EXPIRED');
  }
}

export class CrossCollegeViolationError extends CampusConnectDomainError {
  constructor(homeCollege: string, targetCollege: string) {
    super(`Cross-college interaction between '${homeCollege}' and '${targetCollege}' is disabled by policy.`, 'CROSS_COLLEGE_VIOLATION');
  }
}

export class FeatureDisabledError extends CampusConnectDomainError {
  constructor(flagKey: string) {
    super(`Feature capability '${flagKey}' is currently disabled for this tenant.`, 'FEATURE_DISABLED');
  }
}

export class TrustScoreViolationError extends CampusConnectDomainError {
  constructor(action: string) {
    super(`Action '${action}' rejected due to account trust score restrictions.`, 'TRUST_SCORE_VIOLATION');
  }
}

export class IllegalStateTransitionError extends CampusConnectDomainError {
  constructor(entityName: string, fromState: string, toState: string) {
    super(`Illegal state transition for ${entityName} from '${fromState}' to '${toState}'.`, 'ILLEGAL_STATE_TRANSITION');
  }
}

export class OptimisticLockingError extends CampusConnectDomainError {
  constructor(entityName: string, expectedVersion: number, actualVersion: number) {
    super(`Optimistic locking conflict on ${entityName}: expected version ${expectedVersion}, found ${actualVersion}.`, 'OPTIMISTIC_LOCKING_CONFLICT');
  }
}
