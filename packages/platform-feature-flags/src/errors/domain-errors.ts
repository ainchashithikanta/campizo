/**
 * Platform Feature Flags Domain Errors Catalog
 */

export class DomainError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'DOMAIN_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DuplicateFeatureKeyError extends DomainError {
  constructor(key: string) {
    super(`Feature flag with key '${key}' already exists in platform registry.`, 'DUPLICATE_FEATURE_KEY');
  }
}

export class CircularDependencyError extends DomainError {
  constructor(parentKey: string, childKey: string) {
    super(
      `Circular dependency loop detected between '${parentKey}' and '${childKey}'. Action aborted.`,
      'CIRCULAR_DEPENDENCY'
    );
  }
}

export class DependencyNotSatisfiedError extends DomainError {
  constructor(flagKey: string, missingParentKey: string) {
    super(
      `Prerequisite dependency '${missingParentKey}' is disabled for feature '${flagKey}'.`,
      'DEPENDENCY_NOT_SATISFIED'
    );
  }
}

export class FeatureAlreadyEnabledError extends DomainError {
  constructor(key: string) {
    super(`Feature '${key}' is already in ENABLED state.`, 'FEATURE_ALREADY_ENABLED');
  }
}

export class FeatureAlreadyDisabledError extends DomainError {
  constructor(key: string) {
    super(`Feature '${key}' is already in DISABLED state.`, 'FEATURE_ALREADY_DISABLED');
  }
}

export class InvalidLifecycleTransitionError extends DomainError {
  constructor(fromStage: string, toStage: string) {
    super(`Illegal lifecycle transition from '${fromStage}' to '${toStage}'.`, 'INVALID_LIFECYCLE_TRANSITION');
  }
}

export class SnapshotImmutableError extends DomainError {
  constructor(snapshotId: string) {
    super(`Configuration snapshot '${snapshotId}' is strictly immutable and cannot be modified.`, 'SNAPSHOT_IMMUTABLE');
  }
}

export class ApprovalRequiredError extends DomainError {
  constructor(flagKey: string, policyName: string) {
    super(
      `Production change for '${flagKey}' requires approval under policy template '${policyName}'.`,
      'APPROVAL_REQUIRED'
    );
  }
}

export class ApprovalExpiredError extends DomainError {
  constructor(requestId: string) {
    super(`Approval request ticket '${requestId}' has expired.`, 'APPROVAL_EXPIRED');
  }
}

export class FeatureRemovedError extends DomainError {
  constructor(key: string) {
    super(`Feature '${key}' has been permanently REMOVED and cannot be enabled or evaluated.`, 'FEATURE_REMOVED');
  }
}

export class EnvironmentMismatchError extends DomainError {
  constructor(expected: string, actual: string) {
    super(`Environment mismatch: Expected '${expected}', got '${actual}'.`, 'ENVIRONMENT_MISMATCH');
  }
}

export class InvalidRolloutError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_ROLLOUT');
  }
}

export class PackConflictError extends DomainError {
  constructor(packA: string, packB: string, flagKey: string) {
    super(
      `Conflicting rules detected between feature pack '${packA}' and '${packB}' for flag '${flagKey}'.`,
      'PACK_CONFLICT'
    );
  }
}

export class TemplateConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'TEMPLATE_CONFLICT');
  }
}

export class MaintenanceActiveError extends DomainError {
  constructor(moduleKey: string) {
    super(`Module '${moduleKey}' is currently undergoing maintenance. Write operations locked.`, 'MAINTENANCE_ACTIVE');
  }
}

export class KillSwitchActiveError extends DomainError {
  constructor(flagKey: string) {
    super(`Emergency Kill Switch is active for feature '${flagKey}'. Operation locked.`, 'KILL_SWITCH_ACTIVE');
  }
}

export class EvaluationFailedError extends DomainError {
  constructor(flagKey: string, reason: string) {
    super(`Internal evaluation failed for flag '${flagKey}': ${reason}`, 'EVALUATION_FAILED');
  }
}

export class SnapshotIntegrityError extends DomainError {
  constructor(snapshotId: string) {
    super(
      `Snapshot cryptographic HMAC signature verification failed for '${snapshotId}'.`,
      'SNAPSHOT_INTEGRITY_FAILED'
    );
  }
}

export class TemplateNotFoundError extends DomainError {
  constructor(templateKey: string) {
    super(`Feature template preset '${templateKey}' not found.`, 'TEMPLATE_NOT_FOUND');
  }
}
