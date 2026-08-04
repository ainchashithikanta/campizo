# MS-22.3 — Production Database Architecture & Data Model Specification (Platform Feature Management System)

**Document Type**: Database Architecture & Data Model Specification  
**Status**: APPROVED BY CTO / ARCHITECTURE SPECIFICATION  
**Target Module**: `@college-hub/platform-feature-flags` (Shared Platform Core Service)

---

## Executive Summary

The **Platform Feature Management System** database architecture provides the central persistence foundation for feature enablement, dynamic targeting, configuration snapshots, approval workflows, and immutability governance across every module in College Hub (Professors, Academic Resources, Marketplace, Confessions, Connect, Clubs, Events, Alumni, AI Assistant).

Designed for high-concurrency read evaluation, sub-10ms lookup latencies, and strict tenant isolation, the database utilizes PostgreSQL with time-based range partitioning, Row-Level Security (RLS), append-only immutable audit logs, Feature Environments, Feature Templates, Feature Packs, and HMAC SHA-256 configuration signing.

---

## Section 1 — Multi-Tenant & Multi-Environment Strategy

The Feature Management System is a **shared platform service**. Its database architecture balances global platform definitions with tenant-specific and environment-specific overrides:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      GLOBAL PLATFORM SCOPE (Shared Core)                         │
│  • feature_flags                   • feature_groups                            │
│  • feature_packs                   • feature_templates                         │
│  • feature_dependencies            • feature_versions                          │
│  • approval_requests               • feature_snapshots                         │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│              ENVIRONMENT & TENANT SCOPED (Isolated via Environment/RLS)          │
│  • feature_environment_rules       • college_overrides                          │
│  • user_overrides                  • maintenance_windows                        │
│  • feature_usage_statistics        • pack_member_rules                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Supported Environments

1. **`Development`**: Local sandbox and integration environment.
2. **`Testing`**: Automated E2E and QA testing environment.
3. **`Staging`**: Pre-production environment mirroring production topology.
4. **`Production`**: Live user-facing platform environment across all campuses.

#### Environment Inheritance Rules

- Flag rules cascade from lower to higher environments unless explicitly overridden:
  $$\text{Development} \xrightarrow{\text{Inherit}} \text{Testing} \xrightarrow{\text{Inherit}} \text{Staging} \xrightarrow{\text{Explicit Overrides}} \text{Production}$$
- Production configurations **NEVER** inherit destructive test toggles from lower environments.

---

## Section 2 — Core Entity Catalog (27 Entities)

The expanded data model consists of 27 core aggregate entities:

### Aggregate Root 1: Feature Definition, Environments & Packs

1. **`feature_flags`**: Primary entity storing flag key, default state, and current lifecycle stage.
2. **`feature_environments`**: Environment definitions (`Development`, `Testing`, `Staging`, `Production`).
3. **`feature_environment_rules`**: Environment-specific configuration and targeting rules.
4. **`feature_groups`**: Hierarchical module group container (e.g., `Marketplace`, `Confessions`).
5. **`feature_group_members`**: Mapping flags to feature groups.
6. **`feature_packs`**: Deployable bundles grouping multiple related features across modules (e.g. _Freshers Week Pack_, _Semester Launch Pack_).
7. **`feature_pack_members`**: Mapping features to feature packs with pack-level overrides.
8. **`feature_templates`**: Configuration presets (`Beta`, `Internal`, `Experimental`, `Production`, `Emergency`).
9. **`feature_dependencies`**: DAG graph edges mapping parent prerequisites (`required`, `optional`, `blocking`, `soft`).
10. **`feature_metadata`**: Governance metadata (`owner`, `description`, `createdAt`, `updatedAt`, `removalTargetDate`, `documentationUrl`, `productionReady`).
11. **`feature_tags`**: Key-value categorization tags for search and multi-dimensional filtering.
12. **`feature_documentation`**: Structured markdown runbooks and spec URLs linked to flags.

### Aggregate Root 2: Targeting & Rollout Engine

13. **`rollout_policies`**: Enforced strategy templates (`Global`, `Canary`, `Stepped`, `Blue-Green`).
14. **`rollout_targets`**: Target audience rules (e.g., specific user segments or email domains).
15. **`college_overrides`**: Campus-specific override rules (`collegeId`, state, reason).
16. **`role_overrides`**: Role-specific override rules (`STUDENT`, `FACULTY`, `CR`, `MODERATOR`, `ADMIN`).
17. **`user_overrides`**: Explicit user-level override rules (`userId`, state).
18. **`maintenance_windows`**: Read-only maintenance schedules for target modules/campuses.
19. **`kill_switches`**: High-priority emergency disable records overriding all targeting rules.

### Aggregate Root 3: Governance, Approvals & Auditing

20. **`feature_versions`**: Immutable sequential version snapshots of flag configurations.
21. **`feature_audit_logs`**: Append-only audit record capturing who, when, what, old/new value, and reason.
22. **`approval_requests`**: Change requests submitted for review under approval policy templates.
23. **`approval_actions`**: Individual reviewer decisions (`APPROVED`, `REJECTED`, `DELEGATED`).
24. **`rollout_history`**: Historical timeline tracking percentage rollout progressions.

### Aggregate Root 4: Telemetry, Backup & Maintenance

25. **`feature_snapshots`**: Full environment or module point-in-time state backups for 1-click restore.
26. **`feature_usage_statistics`**: Aggregated performance metrics (`evaluations`, `traffic %`, `error rate`, `last evaluated`).
27. **`stale_feature_reports`**: Automated scanner reports highlighting flags eligible for code deprecation and removal.

---

## Section 3 — Feature Templates & Inheritance

Feature templates supply standardization presets during flag creation:

### Template Presets

- **`Beta` Template**: Default state `OFF`; targets opt-in beta campuses; `Low Risk` approval.
- **`Internal` Template**: Default state `OFF`; targets internal employee role; bypasses production telemetry alerts.
- **`Experimental` Template**: Multivariate percentage rollout enabled; 30-day lifecycle timeout.
- **`Production` Template**: Requires `productionReady = true`; `High Risk` approval template; 4-eye dual auth.
- **`Emergency` Template**: Pre-configured kill switch template; immediate activation bypass.

#### Template Inheritance Rules

- Flag instances inherit default policies from their assigned template.
- Modifying a template updates default governance thresholds for future flag creations without retroactively breaking existing flag configurations.

---

## Section 4 — Feature Packs & Conflict Resolution

### Feature Packs Architecture

A **Feature Pack** bundles multiple features across distinct modules into a single deployable release unit:

```
Freshers Week Pack (Feature Pack)
├── Marketplace (Module Feature)
├── Events (Module Feature)
├── Confessions (Module Feature)
└── Resources (Module Feature)
```

- **Atomic Pack Toggle**: Toggling a Feature Pack enables or disables all constituent features across the entire platform in a single atomic transaction.

### Pack Conflict Resolution Hierarchy

When a feature belongs to multiple packs or has an individual override:

```
1. Emergency Kill Switch   ──► Override EVERYTHING (Return FALSE)
2. Individual Feature Off  ──► Overrides Pack Enablement
3. Active Feature Pack     ──► Overrides Global Flag Default
4. Fallback Default        ──► Default Flag State
```

---

## Section 5 — Feature Lifecycle Data State Machine

Features progress through 8 explicit database states:

```
[ Draft ] ──► [ Development ] ──► [ Beta ] ──► [ Internal ] ──► [ Production ] ──► [ Deprecated ] ──► [ Scheduled Removal ] ──► [ Removed ]
```

---

## Section 6 — Feature Dependencies & DAG Modeling

Dependencies are stored as edges in `feature_dependencies`:

### Dependency Types & Behaviors

1. **`REQUIRED`**: Parent feature MUST be enabled; otherwise evaluation returns `false`.
2. **`OPTIONAL`**: Parent feature enablement alters treatment, but feature can run standalone.
3. **`BLOCKING`**: If parent feature is `ENABLED`, child feature is forcibly `DISABLED`.
4. **`SOFT`**: Evaluation warning logged if parent is disabled, but execution continues.

### Circular Dependency & DAG Validation Status

- Field `dependency_validation_status` stores (`VALIDATED`, `INVALID_CYCLE`, `PENDING_CHECK`).
- Database constraints run **Kahn's Topological Sort** before inserting dependency edges. If a cycle is formed, the insert aborts.

---

## Section 7 — Rollout Architecture & Evaluation Order

Evaluation queries and local in-memory engines process rules in strict priority order:

1. **Kill Switch Record**: Active entry in `kill_switches` $\rightarrow$ Return `FALSE`.
2. **Maintenance Window**: Active entry in `maintenance_windows` $\rightarrow$ Return `READ_ONLY`.
3. **Dependency Status**: `feature_dependencies` failed $\rightarrow$ Return `FALSE`.
4. **Feature Pack Override**: Active Pack state in `feature_packs` $\rightarrow$ Apply Pack State.
5. **Global Flag State**: `feature_flags.enabled` is `FALSE` $\rightarrow$ Return `FALSE`.
6. **Scheduled Launch**: `now() < scheduled_at` $\rightarrow$ Return `FALSE`.
7. **Minimum Version**: Client version below `min_version` $\rightarrow$ Return `FALSE`.
8. **College Override**: Match in `college_overrides` $\rightarrow$ Return Override Value.
9. **Role Override**: Match in `role_overrides` $\rightarrow$ Return Override Value.
10. **User Override**: Match in `user_overrides` $\rightarrow$ Return Override Value.
11. **Percentage Bucket**: `MurmurHash3(userId + flagKey) % 100 < percentage` $\rightarrow$ Return `TRUE`.
12. **Default State**: Return `feature_flags.default_state`.

---

## Section 8 — Approval Workflow Data Flow

```
1. Submit Change ──► Create entry in `approval_requests` (State: PENDING)
                         │
                         ▼
2. Review Actions ──► Insert into `approval_actions` (Reviewers log APPROVED/REJECTED)
                         │
                         ▼
3. Threshold Met ──► Update `approval_requests` (State: APPROVED)
                         │
                         ▼
4. Apply Change  ──► Update `feature_flags` + Insert `feature_versions` + `feature_audit_logs`
```

---

## Section 9 — Configuration Snapshots Data Architecture

- **`feature_snapshots`** stores point-in-time JSON representations of all active flags, environments, packs, and targeting rules.
- Restoring a snapshot creates a new `feature_audit_log` entry referencing `restored_from_snapshot_id` to maintain unbroken audit lineage.

---

## Section 10 — Audit Log Data Model

The `feature_audit_logs` table is strictly **append-only** (INSERT allowed, UPDATE/DELETE prohibited via database triggers).

---

## Section 11 — Feature Usage Statistics Data Model

Telemetry data captured asynchronously in `feature_usage_statistics` (time-bucketed by hour/day).

---

## Section 12 — Index Optimization Matrix (Sub-10ms P95 Target)

| Table                       | Index Columns                       | Index Type                                | Purpose                               |
| --------------------------- | ----------------------------------- | ----------------------------------------- | ------------------------------------- |
| `feature_flags`             | `(flag_key, environment)`           | UNIQUE B-Tree                             | Instant flag definition retrieval     |
| `feature_environment_rules` | `(flag_key, environment_id)`        | UNIQUE B-Tree                             | Environment rule evaluation           |
| `feature_packs`             | `(pack_key, is_active)`             | B-Tree                                    | Atomic feature pack evaluation        |
| `college_overrides`         | `(college_id, flag_key)`            | UNIQUE B-Tree                             | Fast tenant override evaluation       |
| `user_overrides`            | `(user_id, flag_key)`               | UNIQUE B-Tree                             | Instant user-level targeted lookup    |
| `feature_dependencies`      | `(parent_flag_key, child_flag_key)` | B-Tree                                    | Rapid DAG graph traversal             |
| `feature_audit_logs`        | `(flag_key, created_at DESC)`       | B-Tree                                    | Audit timeline display & rollback     |
| `kill_switches`             | `(flag_key, is_active)`             | Partial B-Tree (`WHERE is_active = true`) | Ultra-fast emergency circuit breaking |

---

## Section 13 — Partitioning & Cold Storage Strategy

1. **`feature_audit_logs` Partitioning**: Time-based range partitioning by month (`feature_audit_logs_y2026m08`).
2. **`feature_usage_statistics` Partitioning**: Time-based range partitioning by week (`feature_usage_stats_w32`).
3. **Cold Storage Archival**: Monthly worker moves audit partitions older than 12 months into immutable S3/GCS cold storage (Parquet format).

---

## Section 14 — Security, Immutability & HMAC Verification

1. **HMAC-SHA256 Payload Signing**: Every distributed flag payload generated by the database layer includes an HMAC-SHA256 signature.
2. **Database Level Immutability**: PostgreSQL database triggers block `UPDATE` or `DELETE` queries on `feature_audit_logs`, `feature_versions`, and `feature_snapshots`.
3. **Row-Level Security (RLS)**: Enforced on all tenant tables (`college_overrides`, `maintenance_windows`) matching `current_setting('app.current_college_id')`.

---

## Section 15 — CTO Recommendations & Database Guidelines

1. **Strict Immutability**: Never allow audit logs or versions to be modified or deleted in PostgreSQL.
2. **Atomic Pack Operations**: Wrap Feature Pack state changes in single database transactions.
3. **Automated Partition Maintenance**: Implement automated cron jobs creating future monthly partitions 2 months in advance.

---

## Executive Summary & Final CTO Decision

🟢 **MS-22.3 Production Database Architecture Approved with All Refinements**.

The database architecture specification provides a production-grade persistence layer supporting Feature Environments, Feature Templates, Feature Packs, conflict resolution hierarchies, sub-10ms lookup optimization, and immutable audit logging.

> [!IMPORTANT]
> **MS-22.3 Complete & Approved**. Ready to proceed to **MS-22.4 (Domain Model & Invariants)** when instructed!
