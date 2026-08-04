/**
 * Platform Feature Flags Repository Contracts
 */

export interface FeatureFlagEntity {
  id: string;
  flagKey: string;
  environment: string;
  defaultState: boolean;
  lifecycleStage: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureGroupEntity {
  id: string;
  groupKey: string;
  title: string;
  description?: string | null;
  isGroupEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureDependencyEntity {
  id: string;
  parentFlagKey: string;
  childFlagKey: string;
  dependencyType: string;
  validationStatus: string;
  createdAt: Date;
}

export interface CollegeOverrideEntity {
  id: string;
  collegeId: string;
  flagKey: string;
  overrideState: boolean;
  reasonNote?: string | null;
  createdAt: Date;
}

export interface UserOverrideEntity {
  id: string;
  userId: string;
  flagKey: string;
  overrideState: boolean;
  createdAt: Date;
}

export interface KillSwitchEntity {
  id: string;
  flagKey: string;
  isActive: boolean;
  emergencyReason: string;
  operatorUserId: string;
  trippedAt: Date;
  releasedAt?: Date | null;
}

export interface MaintenanceWindowEntity {
  id: string;
  moduleKey: string;
  collegeId?: string | null;
  isMaintenanceActive: boolean;
  reasonNote: string;
  startTime: Date;
  endTime?: Date | null;
}

export interface ApprovalRequestEntity {
  id: string;
  flagKey: string;
  requesterUserId: string;
  policyTemplate: string;
  status: string;
  proposedChangesJson: unknown;
  createdAt: Date;
  expiresAt: Date;
}

export interface FeatureSnapshotEntity {
  id: string;
  environment: string;
  createdByUserId: string;
  reasonNote: string;
  snapshotPayloadJson: unknown;
  hmacSignature: string;
  createdAt: Date;
}

export interface FeatureAuditLogEntity {
  id: string;
  flagKey: string;
  actorUserId: string;
  actorIpAddress?: string | null;
  actionType: string;
  previousStateJson?: unknown | null;
  newStateJson: unknown;
  reasonNote: string;
  requestId?: string | null;
  approvalRequestId?: string | null;
  hmacSignature: string;
  createdAt: Date;
}

export interface FeatureFlagRepository {
  findByKey(flagKey: string, environment?: string): Promise<FeatureFlagEntity | null>;
  findAll(environment?: string): Promise<FeatureFlagEntity[]>;
  save(flag: Omit<FeatureFlagEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlagEntity>;
  updateState(flagKey: string, environment: string, enabled: boolean): Promise<void>;
  updateLifecycle(flagKey: string, stage: string): Promise<void>;
}

export interface FeatureGroupRepository {
  findByKey(groupKey: string): Promise<FeatureGroupEntity | null>;
  findMembers(groupKey: string): Promise<string[]>;
  saveGroup(group: Omit<FeatureGroupEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureGroupEntity>;
  addMember(groupId: string, flagKey: string): Promise<void>;
}

export interface FeatureDependencyRepository {
  findDependencies(childFlagKey: string): Promise<FeatureDependencyEntity[]>;
  findDependents(parentFlagKey: string): Promise<FeatureDependencyEntity[]>;
  addDependency(parentKey: string, childKey: string, type: string): Promise<void>;
  removeDependency(parentKey: string, childKey: string): Promise<void>;
}

export interface CollegeOverrideRepository {
  findOverride(collegeId: string, flagKey: string): Promise<CollegeOverrideEntity | null>;
  saveOverride(override: Omit<CollegeOverrideEntity, 'id' | 'createdAt'>): Promise<CollegeOverrideEntity>;
}

export interface UserOverrideRepository {
  findOverride(userId: string, flagKey: string): Promise<UserOverrideEntity | null>;
  saveOverride(override: Omit<UserOverrideEntity, 'id' | 'createdAt'>): Promise<UserOverrideEntity>;
}

export interface KillSwitchRepository {
  findActive(flagKey: string): Promise<KillSwitchEntity | null>;
  activate(flagKey: string, operatorUserId: string, reason: string): Promise<KillSwitchEntity>;
  deactivate(flagKey: string, operatorUserId: string): Promise<void>;
}

export interface MaintenanceWindowRepository {
  findActive(moduleKey: string, collegeId?: string): Promise<MaintenanceWindowEntity | null>;
  startMaintenance(moduleKey: string, reason: string, collegeId?: string): Promise<MaintenanceWindowEntity>;
  endMaintenance(id: string): Promise<void>;
}

export interface ApprovalRequestRepository {
  findById(id: string): Promise<ApprovalRequestEntity | null>;
  createRequest(req: Omit<ApprovalRequestEntity, 'id' | 'createdAt'>): Promise<ApprovalRequestEntity>;
  updateStatus(id: string, status: string): Promise<void>;
}

export interface FeatureSnapshotRepository {
  findById(id: string): Promise<FeatureSnapshotEntity | null>;
  saveSnapshot(snapshot: Omit<FeatureSnapshotEntity, 'id' | 'createdAt'>): Promise<FeatureSnapshotEntity>;
  listSnapshots(environment: string): Promise<FeatureSnapshotEntity[]>;
}

export interface FeatureAuditLogRepository {
  appendLog(log: Omit<FeatureAuditLogEntity, 'id' | 'createdAt'>): Promise<FeatureAuditLogEntity>;
  listLogsForFlag(flagKey: string, limit?: number): Promise<FeatureAuditLogEntity[]>;
}
