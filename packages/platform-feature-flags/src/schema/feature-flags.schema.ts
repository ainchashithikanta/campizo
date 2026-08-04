import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey
} from 'drizzle-orm/pg-core';

/**
 * 1. feature_flags
 * Core registry table storing all feature flag definitions, their target environment,
 * lifecycle state, optimistic version counter, and tenant default state.
 */
export const featureFlags = pgTable(
  'feature_flags',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    environment: varchar('environment', { length: 32 }).notNull().default('PRODUCTION'),
    defaultState: boolean('default_state').notNull().default(false),
    lifecycleStage: varchar('lifecycle_stage', { length: 32 }).notNull().default('DRAFT'),
    version: integer('version').notNull().default(1),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    updatedBy: varchar('updated_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table: any) => [
    uniqueIndex('idx_feature_flags_key_env').on(table.flagKey, table.environment),
    index('idx_feature_flags_lifecycle').on(table.lifecycleStage),
    index('idx_feature_flags_deleted').on(table.deletedAt)
  ]
);

/**
 * 2. feature_groups
 * Hierarchical containers grouping related feature flags into functional module units.
 */
export const featureGroups = pgTable(
  'feature_groups',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    groupKey: varchar('group_key', { length: 128 }).notNull().unique(),
    title: varchar('title', { length: 256 }).notNull(),
    description: text('description'),
    isGroupEnabled: boolean('is_group_enabled').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    updatedBy: varchar('updated_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table: any) => [
    index('idx_feature_groups_key').on(table.groupKey),
    index('idx_feature_groups_deleted').on(table.deletedAt)
  ]
);

/**
 * 3. feature_group_members
 * Many-to-many relationship mapping individual feature flags to their parent group.
 */
export const featureGroupMembers = pgTable(
  'feature_group_members',
  {
    groupId: varchar('group_id', { length: 64 })
      .notNull()
      .references(() => featureGroups.id, { onDelete: 'cascade' }),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    addedBy: varchar('added_by', { length: 128 }).notNull().default('system'),
    addedAt: timestamp('added_at').notNull().defaultNow()
  },
  (table: any) => [
    primaryKey({ columns: [table.groupId, table.flagKey] }),
    index('idx_group_members_flag').on(table.flagKey)
  ]
);

/**
 * 4. feature_dependencies
 * Directed Acyclic Graph (DAG) edges representing prerequisite and blocking relationships.
 */
export const featureDependencies = pgTable(
  'feature_dependencies',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    parentFlagKey: varchar('parent_flag_key', { length: 128 }).notNull(),
    childFlagKey: varchar('child_flag_key', { length: 128 }).notNull(),
    dependencyType: varchar('dependency_type', { length: 32 }).notNull().default('REQUIRED'),
    validationStatus: varchar('validation_status', { length: 32 }).notNull().default('VALIDATED'),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [
    uniqueIndex('idx_feature_deps_parent_child').on(table.parentFlagKey, table.childFlagKey),
    index('idx_feature_deps_child').on(table.childFlagKey)
  ]
);

/**
 * 5. feature_metadata
 * Governance metadata bundle containing ownership, documentation, and readiness flags.
 */
export const featureMetadata = pgTable(
  'feature_metadata',
  {
    flagKey: varchar('flag_key', { length: 128 }).primaryKey(),
    ownerTeam: varchar('owner_team', { length: 128 }).notNull(),
    leadEmail: varchar('lead_email', { length: 256 }).notNull(),
    description: text('description').notNull(),
    documentationUrl: text('documentation_url'),
    productionReady: boolean('production_ready').notNull().default(false),
    removalTargetDate: timestamp('removal_target_date'),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    updatedBy: varchar('updated_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_feature_metadata_owner').on(table.ownerTeam)]
);

/**
 * 6. feature_tags
 * Categorical key-value tags attached to feature flags for directory filtering.
 */
export const featureTags = pgTable(
  'feature_tags',
  {
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    tagKey: varchar('tag_key', { length: 64 }).notNull(),
    tagValue: varchar('tag_value', { length: 128 }).notNull()
  },
  (table: any) => [
    primaryKey({ columns: [table.flagKey, table.tagKey] }),
    index('idx_feature_tags_kv').on(table.tagKey, table.tagValue)
  ]
);

/**
 * 7. feature_documentation
 * Runbooks and architecture documentation links associated with a feature flag.
 */
export const featureDocumentation = pgTable(
  'feature_documentation',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    runbookMarkdown: text('runbook_markdown').notNull(),
    architectureSpecUrl: text('architecture_spec_url'),
    updatedBy: varchar('updated_by', { length: 128 }).notNull().default('system'),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_feature_doc_flag').on(table.flagKey)]
);

/**
 * 8. rollout_policies
 * Rollout strategy specifications (Canary, Stepped, Percentage) attached to flags.
 */
export const rolloutPolicies = pgTable(
  'rollout_policies',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    policyType: varchar('policy_type', { length: 32 }).notNull().default('CANARY'),
    percentage: integer('percentage').notNull().default(0),
    isPaused: boolean('is_paused').notNull().default(false),
    version: integer('version').notNull().default(1),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    updatedBy: varchar('updated_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_rollout_policies_flag').on(table.flagKey)]
);

/**
 * 9. rollout_targets
 * Granular attribute targeting rules associated with rollout policies.
 */
export const rolloutTargets = pgTable(
  'rollout_targets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    policyId: varchar('policy_id', { length: 64 })
      .notNull()
      .references(() => rolloutPolicies.id, { onDelete: 'cascade' }),
    targetAttribute: varchar('target_attribute', { length: 64 }).notNull(),
    targetValue: varchar('target_value', { length: 256 }).notNull()
  },
  (table: any) => [index('idx_rollout_targets_policy').on(table.policyId)]
);

/**
 * 10. college_overrides
 * Campus tenant override rules mapping explicit enablement states to specific colleges.
 */
export const collegeOverrides = pgTable(
  'college_overrides',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    collegeId: varchar('college_id', { length: 128 }).notNull(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    overrideState: boolean('override_state').notNull(),
    reasonNote: text('reason_note'),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [
    uniqueIndex('idx_college_overrides_tenant_flag').on(table.collegeId, table.flagKey),
    index('idx_college_overrides_college').on(table.collegeId)
  ]
);

/**
 * 11. role_overrides
 * Role-based override rules (STUDENT, FACULTY, CR, MODERATOR, ADMIN).
 */
export const roleOverrides = pgTable(
  'role_overrides',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    roleName: varchar('role_name', { length: 64 }).notNull(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    overrideState: boolean('override_state').notNull(),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [uniqueIndex('idx_role_overrides_role_flag').on(table.roleName, table.flagKey)]
);

/**
 * 12. user_overrides
 * Anonymized individual user override rules taking top precedence.
 */
export const userOverrides = pgTable(
  'user_overrides',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    overrideState: boolean('override_state').notNull(),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [
    uniqueIndex('idx_user_overrides_user_flag').on(table.userId, table.flagKey),
    index('idx_user_overrides_user').on(table.userId)
  ]
);

/**
 * 13. maintenance_windows
 * Operational maintenance periods forcing read-only treatment across targeted modules.
 */
export const maintenanceWindows = pgTable(
  'maintenance_windows',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    moduleKey: varchar('module_key', { length: 128 }).notNull(),
    collegeId: varchar('college_id', { length: 128 }),
    isMaintenanceActive: boolean('is_maintenance_active').notNull().default(true),
    reasonNote: text('reason_note').notNull(),
    startTime: timestamp('start_time').notNull().defaultNow(),
    endTime: timestamp('end_time'),
    createdBy: varchar('created_by', { length: 128 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_maint_module_active').on(table.moduleKey, table.isMaintenanceActive)]
);

/**
 * 14. kill_switches
 * Emergency circuit breakers overriding all other targeting rules instantly.
 */
export const killSwitches = pgTable(
  'kill_switches',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    emergencyReason: text('emergency_reason').notNull(),
    operatorUserId: varchar('operator_user_id', { length: 128 }).notNull(),
    trippedAt: timestamp('tripped_at').notNull().defaultNow(),
    releasedAt: timestamp('released_at')
  },
  (table: any) => [index('idx_kill_switches_flag_active').on(table.flagKey, table.isActive)]
);

/**
 * 15. feature_versions
 * Sequential immutable version snapshot entries for historical inspection.
 */
export const featureVersions = pgTable(
  'feature_versions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    version: integer('version').notNull(),
    snapshotPayloadJson: jsonb('snapshot_payload_json').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [uniqueIndex('idx_feature_versions_key_ver').on(table.flagKey, table.version)]
);

/**
 * 16. feature_audit_logs
 * APPEND-ONLY IMMUTABLE table recording every administrative action and configuration mutation.
 */
export const featureAuditLogs = pgTable(
  'feature_audit_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    actorUserId: varchar('actor_user_id', { length: 128 }).notNull(),
    actorIpAddress: varchar('actor_ip_address', { length: 64 }),
    actionType: varchar('action_type', { length: 64 }).notNull(),
    previousStateJson: jsonb('previous_state_json'),
    newStateJson: jsonb('new_state_json').notNull(),
    reasonNote: text('reason_note').notNull(),
    requestId: varchar('request_id', { length: 128 }),
    approvalRequestId: varchar('approval_request_id', { length: 64 }),
    hmacSignature: varchar('hmac_signature', { length: 256 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [
    index('idx_audit_logs_flag_created').on(table.flagKey, table.createdAt),
    index('idx_audit_logs_actor').on(table.actorUserId)
  ]
);

/**
 * 17. approval_requests
 * Change ticket requests requiring peer review under 4-Eye governance policies.
 */
export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    requesterUserId: varchar('requester_user_id', { length: 128 }).notNull(),
    policyTemplate: varchar('policy_template', { length: 64 }).notNull().default('HIGH_RISK'),
    status: varchar('status', { length: 32 }).notNull().default('PENDING'),
    proposedChangesJson: jsonb('proposed_changes_json').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull()
  },
  (table: any) => [index('idx_approval_req_flag_status').on(table.flagKey, table.status)]
);

/**
 * 18. approval_actions
 * Reviewer vote decisions logged against approval requests.
 */
export const approvalActions = pgTable(
  'approval_actions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    requestId: varchar('request_id', { length: 64 })
      .notNull()
      .references(() => approvalRequests.id, { onDelete: 'cascade' }),
    reviewerUserId: varchar('reviewer_user_id', { length: 128 }).notNull(),
    decision: varchar('decision', { length: 32 }).notNull(),
    reasonNote: text('reason_note'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_approval_actions_req').on(table.requestId)]
);

/**
 * 19. rollout_history
 * Append-only log tracking percentage bucket progressions during canary releases.
 */
export const rolloutHistory = pgTable(
  'rollout_history',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    previousPercentage: integer('previous_percentage').notNull(),
    newPercentage: integer('new_percentage').notNull(),
    operatorUserId: varchar('operator_user_id', { length: 128 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_rollout_history_flag').on(table.flagKey)]
);

/**
 * 20. feature_snapshots
 * APPEND-ONLY IMMUTABLE environment state backups for point-in-time restoration.
 */
export const featureSnapshots = pgTable(
  'feature_snapshots',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    environment: varchar('environment', { length: 32 }).notNull(),
    createdByUserId: varchar('created_by_user_id', { length: 128 }).notNull(),
    reasonNote: text('reason_note').notNull(),
    snapshotPayloadJson: jsonb('snapshot_payload_json').notNull(),
    hmacSignature: varchar('hmac_signature', { length: 256 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_feature_snapshots_env_created').on(table.environment, table.createdAt)]
);

/**
 * 21. feature_usage_statistics
 * Time-bucketed aggregates measuring evaluation throughput, error rates, and cache hits.
 */
export const featureUsageStatistics = pgTable(
  'feature_usage_statistics',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    collegeId: varchar('college_id', { length: 128 }).notNull().default('global'),
    timeBucket: timestamp('time_bucket').notNull(),
    evaluationsCount: integer('evaluations_count').notNull().default(0),
    enabledCount: integer('enabled_count').notNull().default(0),
    disabledCount: integer('disabled_count').notNull().default(0),
    uniqueUsersCount: integer('unique_users_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    cacheHitCount: integer('cache_hit_count').notNull().default(0),
    cacheMissCount: integer('cache_miss_count').notNull().default(0),
    lastEvaluatedAt: timestamp('last_evaluated_at').notNull().defaultNow()
  },
  (table: any) => [
    uniqueIndex('idx_usage_stats_key_college_bucket').on(table.flagKey, table.collegeId, table.timeBucket)
  ]
);

/**
 * 22. stale_feature_reports
 * Automated background report flagging unchanged production flags for deprecation.
 */
export const staleFeatureReports = pgTable(
  'stale_feature_reports',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    flagKey: varchar('flag_key', { length: 128 }).notNull(),
    daysConstantEvaluations: integer('days_constant_evaluations').notNull(),
    constantValue: boolean('constant_value').notNull(),
    ownerTeam: varchar('owner_team', { length: 128 }).notNull(),
    reportedAt: timestamp('reported_at').notNull().defaultNow()
  },
  (table: any) => [index('idx_stale_reports_flag').on(table.flagKey)]
);
