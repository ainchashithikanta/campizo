/**
 * Platform Feature Flags Reusable Domain Invariants & Assertions
 */

import {
  DuplicateFeatureKeyError,
  CircularDependencyError,
  InvalidLifecycleTransitionError,
  InvalidRolloutError,
  SnapshotImmutableError,
  ApprovalRequiredError,
  FeatureRemovedError,
  KillSwitchActiveError,
  SnapshotIntegrityError,
  PackConflictError,
  TemplateConflictError
} from '../errors/domain-errors.js';
import { EnvironmentType, LifecycleStageType } from './value-objects.js';

export function assertUniqueFeatureKey(key: string, existingKeys: Set<string>): void {
  if (existingKeys.has(key)) {
    throw new DuplicateFeatureKeyError(key);
  }
}

const ALLOWED_LIFECYCLE_TRANSITIONS: Record<LifecycleStageType, LifecycleStageType[]> = {
  DRAFT: ['DEVELOPMENT', 'REMOVED'],
  DEVELOPMENT: ['BETA', 'INTERNAL', 'REMOVED'],
  BETA: ['INTERNAL', 'PRODUCTION', 'REMOVED'],
  INTERNAL: ['PRODUCTION', 'REMOVED'],
  PRODUCTION: ['DEPRECATED', 'REMOVED'],
  DEPRECATED: ['SCHEDULED_REMOVAL', 'PRODUCTION', 'REMOVED'],
  SCHEDULED_REMOVAL: ['REMOVED'],
  REMOVED: []
};

export function assertValidLifecycleTransition(fromStage: LifecycleStageType, toStage: LifecycleStageType): void {
  if (fromStage === 'REMOVED') {
    throw new FeatureRemovedError('TARGET_FLAG');
  }
  const allowed = ALLOWED_LIFECYCLE_TRANSITIONS[fromStage] || [];
  if (!allowed.includes(toStage)) {
    throw new InvalidLifecycleTransitionError(fromStage, toStage);
  }
}

export function assertNoCircularDependencies(
  parentKey: string,
  childKey: string,
  adjacencyList: Map<string, string[]>
): void {
  if (parentKey === childKey) {
    throw new CircularDependencyError(parentKey, childKey);
  }

  // Detect cycle using BFS traversal
  const visited = new Set<string>();
  const queue = [childKey];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === parentKey) {
      throw new CircularDependencyError(parentKey, childKey);
    }
    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = adjacencyList.get(current) || [];
      for (const n of neighbors) {
        queue.push(n);
      }
    }
  }
}

export function assertApprovalRequired(
  flagKey: string,
  environment: EnvironmentType,
  hasApproval: boolean,
  policyName: string = 'Production4EyePolicy'
): void {
  if (environment === 'PRODUCTION' && !hasApproval) {
    throw new ApprovalRequiredError(flagKey, policyName);
  }
}

export function assertValidRolloutPercentage(percentage: number): void {
  if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
    throw new InvalidRolloutError(`Rollout percentage ${percentage} is invalid. Must be between 0 and 100.`);
  }
}

export function assertValidEnvironment(env: string): asserts env is EnvironmentType {
  const valid: EnvironmentType[] = ['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION'];
  if (!valid.includes(env as EnvironmentType)) {
    throw new Error(`Invalid environment '${env}'. Expected one of ${valid.join(', ')}`);
  }
}

export function assertImmutableAuditLog(action: 'UPDATE' | 'DELETE'): void {
  if (action === 'UPDATE' || action === 'DELETE') {
    throw new SnapshotImmutableError('AUDIT_LOG_ENTRY');
  }
}

export function assertSingleActiveKillSwitch(flagKey: string, isKillSwitchActive: boolean): void {
  if (isKillSwitchActive) {
    throw new KillSwitchActiveError(flagKey);
  }
}

export function assertSnapshotIntegrity(snapshotId: string, computedHmac: string, expectedHmac: string): void {
  if (computedHmac !== expectedHmac) {
    throw new SnapshotIntegrityError(snapshotId);
  }
}

export function assertPackConsistency(packA: string, packB: string, flagKey: string, conflicts: boolean): void {
  if (conflicts) {
    throw new PackConflictError(packA, packB, flagKey);
  }
}

export function assertTemplateConsistency(isValid: boolean, message: string): void {
  if (!isValid) {
    throw new TemplateConflictError(message);
  }
}
