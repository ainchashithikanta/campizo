/**
 * Platform Feature Flags Domain Events Catalog
 */

export interface BaseDomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  collegeId?: string | undefined;
  requestId?: string | undefined;
}

export interface FeatureCreatedEvent extends BaseDomainEvent {
  eventType: 'FeatureCreated';
  flagKey: string;
  category: string;
  owner: string;
  defaultState: boolean;
}

export interface FeatureUpdatedEvent extends BaseDomainEvent {
  eventType: 'FeatureUpdated';
  flagKey: string;
  version: number;
  changes: Record<string, unknown>;
}

export interface FeatureEnabledEvent extends BaseDomainEvent {
  eventType: 'FeatureEnabled';
  flagKey: string;
  environment: string;
}

export interface FeatureDisabledEvent extends BaseDomainEvent {
  eventType: 'FeatureDisabled';
  flagKey: string;
  environment: string;
}

export interface FeatureDeletedEvent extends BaseDomainEvent {
  eventType: 'FeatureDeleted';
  flagKey: string;
  reason: string;
}

export interface KillSwitchActivatedEvent extends BaseDomainEvent {
  eventType: 'KillSwitchActivated';
  flagKey: string;
  reason: string;
  operatorUserId: string;
}

export interface KillSwitchReleasedEvent extends BaseDomainEvent {
  eventType: 'KillSwitchReleased';
  flagKey: string;
  operatorUserId: string;
}

export interface MaintenanceStartedEvent extends BaseDomainEvent {
  eventType: 'MaintenanceStarted';
  moduleKey: string;
  reason: string;
  expectedEndTime?: string | undefined;
}

export interface MaintenanceEndedEvent extends BaseDomainEvent {
  eventType: 'MaintenanceEnded';
  moduleKey: string;
}

export interface DependencyAddedEvent extends BaseDomainEvent {
  eventType: 'DependencyAdded';
  parentFlagKey: string;
  childFlagKey: string;
  dependencyType: string;
}

export interface DependencyRemovedEvent extends BaseDomainEvent {
  eventType: 'DependencyRemoved';
  parentFlagKey: string;
  childFlagKey: string;
}

export interface FeatureGroupCreatedEvent extends BaseDomainEvent {
  eventType: 'FeatureGroupCreated';
  groupKey: string;
  title: string;
}

export interface FeatureGroupUpdatedEvent extends BaseDomainEvent {
  eventType: 'FeatureGroupUpdated';
  groupKey: string;
  isGroupEnabled: boolean;
}

export interface FeaturePackCreatedEvent extends BaseDomainEvent {
  eventType: 'FeaturePackCreated';
  packKey: string;
  memberCount: number;
}

export interface FeaturePackActivatedEvent extends BaseDomainEvent {
  eventType: 'FeaturePackActivated';
  packKey: string;
  environment: string;
}

export interface FeaturePackDeactivatedEvent extends BaseDomainEvent {
  eventType: 'FeaturePackDeactivated';
  packKey: string;
  environment: string;
}

export interface SnapshotCreatedEvent extends BaseDomainEvent {
  eventType: 'SnapshotCreated';
  snapshotId: string;
  environment: string;
  flagCount: number;
}

export interface SnapshotRestoredEvent extends BaseDomainEvent {
  eventType: 'SnapshotRestored';
  snapshotId: string;
  environment: string;
  restoredByUserId: string;
}

export interface ApprovalRequestedEvent extends BaseDomainEvent {
  eventType: 'ApprovalRequested';
  approvalId: string;
  flagKey: string;
  requesterUserId: string;
  policyTemplate: string;
}

export interface ApprovalGrantedEvent extends BaseDomainEvent {
  eventType: 'ApprovalGranted';
  approvalId: string;
  flagKey: string;
  reviewerUserId: string;
}

export interface ApprovalRejectedEvent extends BaseDomainEvent {
  eventType: 'ApprovalRejected';
  approvalId: string;
  flagKey: string;
  reviewerUserId: string;
  reason: string;
}

export interface ApprovalWithdrawnEvent extends BaseDomainEvent {
  eventType: 'ApprovalWithdrawn';
  approvalId: string;
  requesterUserId: string;
}

export interface LifecycleStageChangedEvent extends BaseDomainEvent {
  eventType: 'LifecycleStageChanged';
  flagKey: string;
  fromStage: string;
  toStage: string;
}

export interface RolloutStartedEvent extends BaseDomainEvent {
  eventType: 'RolloutStarted';
  flagKey: string;
  initialPercentage: number;
  environment: string;
}

export interface RolloutCompletedEvent extends BaseDomainEvent {
  eventType: 'RolloutCompleted';
  flagKey: string;
  targetPercentage: number;
}

export interface RolloutCancelledEvent extends BaseDomainEvent {
  eventType: 'RolloutCancelled';
  flagKey: string;
  reason: string;
}

export interface FeatureDeprecatedEvent extends BaseDomainEvent {
  eventType: 'FeatureDeprecated';
  flagKey: string;
  removalTargetDate: string;
}

export interface FeatureRemovedEvent extends BaseDomainEvent {
  eventType: 'FeatureRemoved';
  flagKey: string;
}

export interface EnvironmentRuleUpdatedEvent extends BaseDomainEvent {
  eventType: 'EnvironmentRuleUpdated';
  flagKey: string;
  environment: string;
}

export interface FeatureEvaluatedEvent extends BaseDomainEvent {
  eventType: 'FeatureEvaluated';
  flagKey: string;
  enabled: boolean;
  reason: string;
  matchedRule: string;
  evaluationTimeMs: number;
}

export interface EvaluationCacheHitEvent extends BaseDomainEvent {
  eventType: 'EvaluationCacheHit';
  flagKey: string;
  cacheSource: string;
}

export interface EvaluationCacheMissEvent extends BaseDomainEvent {
  eventType: 'EvaluationCacheMiss';
  flagKey: string;
}

export interface DependencyViolationDetectedEvent extends BaseDomainEvent {
  eventType: 'DependencyViolationDetected';
  flagKey: string;
  missingParentKey: string;
}

export interface RolloutThresholdReachedEvent extends BaseDomainEvent {
  eventType: 'RolloutThresholdReached';
  flagKey: string;
  currentPercentage: number;
}

export interface StaleFeatureDetectedEvent extends BaseDomainEvent {
  eventType: 'StaleFeatureDetected';
  flagKey: string;
  daysConstant: number;
}

export type PlatformFeatureFlagDomainEvent =
  | FeatureCreatedEvent
  | FeatureUpdatedEvent
  | FeatureEnabledEvent
  | FeatureDisabledEvent
  | FeatureDeletedEvent
  | KillSwitchActivatedEvent
  | KillSwitchReleasedEvent
  | MaintenanceStartedEvent
  | MaintenanceEndedEvent
  | DependencyAddedEvent
  | DependencyRemovedEvent
  | FeatureGroupCreatedEvent
  | FeatureGroupUpdatedEvent
  | FeaturePackCreatedEvent
  | FeaturePackActivatedEvent
  | FeaturePackDeactivatedEvent
  | SnapshotCreatedEvent
  | SnapshotRestoredEvent
  | ApprovalRequestedEvent
  | ApprovalGrantedEvent
  | ApprovalRejectedEvent
  | ApprovalWithdrawnEvent
  | LifecycleStageChangedEvent
  | RolloutStartedEvent
  | RolloutCompletedEvent
  | RolloutCancelledEvent
  | FeatureDeprecatedEvent
  | FeatureRemovedEvent
  | EnvironmentRuleUpdatedEvent
  | FeatureEvaluatedEvent
  | EvaluationCacheHitEvent
  | EvaluationCacheMissEvent
  | DependencyViolationDetectedEvent
  | RolloutThresholdReachedEvent
  | StaleFeatureDetectedEvent;
