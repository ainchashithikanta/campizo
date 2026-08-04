# College Hub: Database Standards & Schema Governance (MS-06)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Database Standards, ERD Foundation & Migration Guidelines
- **Document Version**: 1.0.0-FINAL
- **Package Reference**: `@college-hub/database`
- **Status**: Official Engineering Standard (MS-06 Complete)

---

## 1. Core Foundation ERD Diagram

```mermaid
erdiagram
    college_tenants ||--o{ users : "hosts (1:N)"
    college_tenants ||--o{ audit_logs : "records (1:N)"
    users ||--o{ audit_logs : "performs (1:N)"

    college_tenants {
        uuid id PK
        varchar name
        varchar slug UK
        jsonb allowed_email_domains
        jsonb theme
        jsonb enabled_modules
        jsonb moderation_policy
        varchar tier
        varchar custom_domain
        integer version
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    users {
        uuid id PK
        uuid college_id FK
        varchar email
        varchar password_hash
        varchar full_name
        varchar role
        boolean is_email_verified
        varchar avatar_url
        integer version
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    audit_logs {
        uuid id PK
        uuid college_id FK
        uuid actor_user_id FK
        varchar actor_role
        varchar action
        varchar target_entity_id
        varchar target_entity_type
        jsonb old_value
        jsonb new_value
        varchar ip_address
        text user_agent
        timestamp created_at
    }
```

---

## 2. Base Table Architecture & Standard Columns

Every database table in College Hub inherits standard infrastructure columns defined in `src/schema/base.ts`:

1. **UUID Primary Keys (`id uuid default gen_random_uuid()`)**: Eliminates sequential ID guessing attacks and simplifies cross-region data sync.
2. **Optimistic Concurrency Control (`version integer default 1`)**: Counter incremented on every update to detect concurrent write collisions.
3. **UTC Audit Timestamps (`created_at`, `updated_at`)**: Standard 3-decimal precision UTC timestamps.
4. **Soft Delete Column (`deleted_at timestamp null`)**: When present, records are soft-deleted by setting `deleted_at = NOW()` instead of issuing SQL `DELETE` queries.

---

## 3. Module-Owned Schema Guidelines

Future business feature modules (Rate My Professor, Materials, Marketplace, Confessions, etc.) own their schema files while extending base database infrastructure:

- Module schemas are placed under `/modules/<module-name>/src/schema.ts` or `/packages/database/src/schema/<module-name>.ts`.
- Every multi-tenant module table MUST include `college_id uuid NOT NULL` referencing `college_tenants.id` with `onDelete: 'cascade'`.

---

## 4. Migration & Rollback Strategy

1. **Migration File Generation**:
   ```bash
   pnpm --filter @college-hub/database db:generate
   ```
   Generates timestamped SQL migration files in `/packages/database/migrations/`.
2. **Migration Execution**:
   ```bash
   pnpm --filter @college-hub/database db:migrate
   ```
3. **Rollback Policy**:
   - All DDL migrations MUST be backward-compatible (adding columns as optional/default first).
   - Destructive migrations (dropping columns/tables) require a multi-release phase transition:
     - _Phase A_: Soft-deprecate column.
     - _Phase B_: Stop writing to column.
     - _Phase C_: Drop column via explicit rollback migration script.

---

## 5. Seeding Guidelines

- Seeders implement `DatabaseSeeder` interface (`version`, `seed(db)`).
- All seed inserts MUST be idempotent using `.onConflictDoNothing()`.

---

## 6. Database Health Check Strategy

Application servers probe PostgreSQL health on `/health` calls using `checkDatabaseHealth(pool)`, measuring query latency and connection pool readiness.

---

_End of Database Standards Specification._
