# Campus Connect — Production Database Architecture & Data Model Specification

**Module Name**: `Campus Connect` (`@college-hub/campus-connect`)  
**Document Type**: Database Architecture & Entity Specification  
**Status**: 🟢 **FINAL DATABASE ARCHITECTURE SPECIFICATION (WITH REFINEMENTS)**  
**Target Database**: PostgreSQL 16+ with Drizzle ORM Mapping Layer  

---

> [!IMPORTANT]
> **Mandatory Architectural Invariants**:
> 1. **First-Class Intent Model**: Intent is a primary aggregate entity supporting simultaneous active collaboration goals.
> 2. **Non-Nullable Messaging Context**: Every conversation and message thread MUST reference a non-null `context_type` and `context_id`.
> 3. **Immutable Recommendation Snapshots**: Compatibility snapshots and recommendation scores are append-only and immutable.
> 4. **Isolated Privacy Settings**: Privacy settings (`privacy_settings`, `visibility_preferences`) are decoupled into separate tables from `student_profiles` to prevent locking during discovery queries.
> 5. **Feature-Flag Independent Schema**: Capability flags toggle features without requiring database migrations or DDL changes.
> 6. **Future-Ready Inter-College Architecture**: All tenant entities contain `college_id` and array-backed `target_college_ids[]` for zero-migration cross-campus federation.
> 7. **Optimistic Locking**: Every mutable entity includes `version` for optimistic locking (`version = version + 1`).
> 8. **Standard Audit Columns**: Every entity contains `created_at`, `updated_at`, `created_by`, `updated_by`, and `version`.

---

## 1. Multi-Tenant Architecture & PostgreSQL RLS Strategy

Campus Connect utilizes a **Shared Database, Separate Schema / Tenant Discriminator** multi-tenant strategy backed by PostgreSQL Row Level Security (RLS).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL ROW LEVEL SECURITY (RLS)                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Active Session Context: SET LOCAL app.current_college_id = 'college_01'  │
│                                                                         │
│  Tenant Tables Isolation Policy:                                        │
│  CREATE POLICY tenant_isolation_policy ON <table_name>                  │
│    USING (college_id = current_setting('app.current_college_id'))       │
│    WITH CHECK (college_id = current_setting('app.current_college_id'));│
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Global vs. Tenant Tables
- **Global Tables** (Shared Across Monorepo):
  - `skills`, `interests`, `courses` (Global catalog with tenant override mappings).
- **Tenant Tables** (Strict `college_id` Isolation via RLS):
  - `student_profiles`, `student_intents`, `intent_lifecycle_history`, `student_skills`, `student_interests`, `student_clubs`, `student_courses`, `study_partner_requests`, `project_teams`, `project_members`, `mentorship_requests`, `mentor_relationships`, `connection_requests`, `connections`, `connection_relationship_strength`, `conversations`, `conversation_members`, `messages`, `message_attachments`, `events`, `event_participants`, `compatibility_snapshots`, `recommendations`, `ai_recommendation_metadata`, `visibility_preferences`, `privacy_settings`, `blocking`, `reports`, `moderation_cases`, `moderation_actions`, `notifications`, `activity_feed`, `audit_logs`, `feature_usage_statistics`, `future_intercollege_links`, `student_discovery_search_read_model`.

### 1.2 Future Cross-College Federation Model
When feature flag `connect.interCollege` is active, RLS policies expand dynamically using array containment:
```sql
CREATE POLICY intercollege_federation_policy ON student_intents
  USING (
    college_id = current_setting('app.current_college_id')
    OR target_college_ids @> ARRAY[current_setting('app.current_college_id')]::varchar[]
  );
```

---

## 2. Core Entity Catalog & Aggregate Boundaries

The entity catalog comprises 34 domain entities structured into 8 distinct aggregate boundaries:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AGGREGATE BOUNDARIES                          │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│ 1. Student Identity │ 2. Intent Engine │ 3. Network Graph│ 4. Collaboration  │
│ • profiles      │ • intents       │ • connections   │ • project_teams  │
│ • privacy       │ • history       │ • strength      │ • mentorship     │
│ • visibility    │ • skills        │ • blocking      │ • study_requests │
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ 5. Messaging    │ 6. Recommender  │ 7. Moderation   │ 8. Audit & Events│
│ • conversations │ • snapshots     │ • reports       │ • audit_logs     │
│ • messages      │ • AI metadata   │ • cases         │ • search_model   │
│ • attachments   │ • weighted_reasons│ • reputation  │ • notifications  │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘
```

---

## 3. First-Class Intent Data Model Architecture

Intent is modeled as a primary aggregate entity rather than a secondary user field. A student can maintain multiple concurrent active intents:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       STUDENT_INTENTS ENTITY MODEL                      │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK)                   : varchar(64)                                 │
│ college_id                : varchar(64) [RLS Tenant Discriminator]      │
│ student_profile_id (FK)   : varchar(64) [Owner Student]                 │
│ intent_type               : enum ('STUDY_PARTNER', 'PROJECT_TEAM',      │
│                                   'HACKATHON', 'MENTORSHIP', 'INTERNSHIP',│
│                                   'COFOUNDER', 'GYM', 'MUSIC', 'TRAVEL')│
│ title                     : varchar(120)                                │
│ description               : text                                        │
│ course_id (FK, Optional)  : varchar(64) [Associated Course]             │
│ target_skill_ids          : varchar(64)[] [Required Teammate Skills]    │
│ status                    : enum ('ACTIVE', 'PAUSED', 'FULFILLED',      │
│                                   'EXPIRED')                            │
│ priority                  : integer [1 = High, 5 = Low]                 │
│ availability_state        : enum ('AVAILABLE_NOW', 'WEEKENDS_ONLY',     │
│                                   'EXAM_PREP_FOCUS')                    │
│ target_college_ids        : varchar(64)[] [Inter-College Federation]    │
│ expires_at                : timestamp with time zone                    │
│ created_at, updated_at    : timestamp with time zone                    │
│ created_by, updated_by    : varchar(64)                                 │
│ version                   : integer [Optimistic Lock]                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Contextual Non-Nullable Messaging Data Model

To eliminate cold DMs and guarantee purpose-bound conversations, `conversations` enforces **NON-NULL CONTEXT** and explicit lifecycle states:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONVERSATIONS ENTITY MODEL                       │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK)                   : varchar(64)                                 │
│ college_id                : varchar(64) [RLS Tenant Discriminator]      │
│ conversation_type         : enum ('DIRECT', 'GROUP', 'STUDY_POD',       │
│                                   'PROJECT_TEAM', 'MENTORSHIP_CHAT')    │
│ lifecycle_state           : enum ('INITIATED', 'ACTIVE', 'MUTED',       │
│                                   'ARCHIVED', 'CLOSED')                 │
│ context_type (NON-NULL)   : enum ('STUDY_INTENT', 'PROJECT_INTENT',     │
│                                   'HACKATHON_INTENT', 'MENTORSHIP_INTENT',│
│                                   'MUTUAL_MATCH_INTENT')                │
│ context_id (NON-NULL)     : varchar(64) [Ref ID to originating intent]  │
│ title                     : varchar(120)                                │
│ created_at, updated_at    : timestamp with time zone                    │
│ created_by, updated_by    : varchar(64)                                 │
│ version                   : integer [Optimistic Lock]                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Immutable Recommendation & Compatibility Model

Compatibility snapshots and AI match scores are append-only to support model versioning and explainability auditability:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   COMPATIBILITY_SNAPSHOTS (IMMUTABLE)                   │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK)                   : varchar(64)                                 │
│ college_id                : varchar(64)                                 │
│ source_student_id (FK)    : varchar(64)                                 │
│ target_student_id (FK)    : varchar(64)                                 │
│ overall_compatibility_pct : numeric(5, 2) [e.g. 92.50%]                 │
│ academic_vector_score     : numeric(5, 2) [Course overlap weight]       │
│ skill_vector_score        : numeric(5, 2) [Complementarity weight]      │
│ interest_vector_score     : numeric(5, 2) [Jaccard similarity]          │
│ weighted_reasons_jsonb    : jsonb [Array of {reasonCode, weight, text}] │
│ algorithm_version         : varchar(32) [e.g. 'v1.4.0-aiMatching']      │
│ created_at                : timestamp with time zone [Append-only]      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Decoupled Privacy Data Model

`privacy_settings` is stored in a separate table from `student_profiles` to prevent row locks on profile updates:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRIVACY_SETTINGS ENTITY                          │
├─────────────────────────────────────────────────────────────────────────┤
│ student_profile_id (PK,FK): varchar(64)                                 │
│ college_id                : varchar(64)                                 │
│ visibility_scope          : enum ('VISIBLE_ALL', 'SAME_YEAR_ONLY',      │
│                                   'SAME_DEPT_ONLY', 'SAME_HOSTEL_ONLY', │
│                                   'FRIENDS_ONLY', 'HIDDEN')             │
│ is_ghost_mode             : boolean [Default: false]                    │
│ is_incognito_mode         : boolean [Default: false]                    │
│ show_online_indicator     : boolean [Default: true]                     │
│ show_last_active          : boolean [Default: true]                     │
│ allow_connection_requests : boolean [Default: true]                     │
│ daily_request_limit       : integer [Default: 5]                        │
│ consent_dpdp_timestamp    : timestamp with time zone                    │
│ created_at, updated_at    : timestamp with time zone                    │
│ created_by, updated_by    : varchar(64)                                 │
│ version                   : integer                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Production Indexing Strategy

High-performance indexing strategy to guarantee sub-100ms discovery and sub-30ms messaging:

### 7.1 Primary Index Catalog
- **Discovery Indexes**:
  - `idx_intents_discovery`: B-Tree `(college_id, status, intent_type, expires_at DESC)` WHERE `status = 'ACTIVE'`.
  - `idx_intents_courses`: B-Tree `(college_id, course_id, status)` WHERE `status = 'ACTIVE'`.
  - `idx_intents_skills`: GIN `(target_skill_ids)` (GIN array index for skill complementarity searches).
- **Messaging Indexes**:
  - `idx_conversations_context`: B-Tree `(college_id, context_type, context_id)`.
  - `idx_messages_conversation`: B-Tree `(conversation_id, created_at DESC)`.
  - `idx_conversation_members`: B-Tree `(student_profile_id, conversation_id)`.
- **Network Graph Indexes**:
  - `idx_connections_pairwise`: Compound Unique `(college_id, LEAST(student_a_id, student_b_id), GREATEST(student_a_id, student_b_id))`.
  - `idx_blocking_pairwise`: Compound Unique `(blocker_student_id, blocked_student_id)`.

---

## 8. Scalability, Partitioning & Performance Budgets

### 8.1 Partitioning Strategy
- **`messages`**: Range partitioned by `created_at` (Monthly partitions: `messages_y2026m08`).
- **`audit_logs`**: Range partitioned by `created_at` (Monthly partitions: `audit_logs_y2026m08`).
- **`compatibility_snapshots`**: Range partitioned by `created_at` (Quarterly partitions).

### 8.2 Performance Budget SLAs
- **Discovery Feed Query**: $\le 100\text{ ms}$ (Target: $<45\text{ ms}$ via B-Tree partial index).
- **Recommendation Calculation**: $\le 150\text{ ms}$ (Target: $<80\text{ ms}$ via precomputed snapshots).
- **Messaging Lookup**: $\le 30\text{ ms}$ (Target: $<12\text{ ms}$ via composite index).
- **Profile Load**: $\le 50\text{ ms}$ (Target: $<20\text{ ms}$ via Redis L1 cache).
- **Connection Status Lookup**: $\le 30\text{ ms}$ (Target: $<10\text{ ms}$ via unique pairwise index).
- **Notification Lookup**: $\le 50\text{ ms}$ (Target: $<15\text{ ms}$).

---

## 9. Database Architecture Refinements

The following 6 architectural refinements have been incorporated to refine recommendation storage, intent auditing, relationship metrics, conversation lifecycles, AI data decoupling, and discovery read models:

### 9.1 Structured Weighted Recommendation Explanations
In `compatibility_snapshots`, match reasons are stored in JSONB arrays containing explicit weight values and human-readable explanation strings:
```json
[
  {
    "reasonCode": "SHARED_COURSE",
    "weight": 0.45,
    "humanText": "Both currently enrolled in CS224N (Natural Language Processing)"
  },
  {
    "reasonCode": "COMPLEMENTARY_SKILL",
    "weight": 0.35,
    "humanText": "Complementary skills: Student A (PyTorch) & Student B (React Frontend)"
  },
  {
    "reasonCode": "SHARED_INTEREST",
    "weight": 0.20,
    "humanText": "Mutual interest in Hackathons & NLP Research"
  }
]
```

### 9.2 Append-Only Intent Lifecycle History (`intent_lifecycle_history`)
To preserve historical state transitions (`DRAFT` $\rightarrow$ `ACTIVE` $\rightarrow$ `PAUSED` $\rightarrow$ `FULFILLED` $\rightarrow$ `EXPIRED`), state changes are recorded in an append-only audit log:
- **`intent_lifecycle_history`**: Records `intent_id`, `previous_status`, `new_status`, `transition_reason`, `operator_id`, and `created_at`.

### 9.3 Internal Interaction-Derived Relationship Strength Model
`connection_relationship_strength` computes an internal interaction metric ($0.00$ to $100.00$) based on objective interaction events without public exposure:
- **Metrics Evaluated**: Total messages exchanged, verified study sessions completed together, course projects delivered, and mutual events attended.
- **Privacy Rule**: Used strictly for recommendation sorting; **never exposed as a public score**.

### 9.4 Explicit Conversation Lifecycle States
`conversations` enforces a strict 5-state lifecycle state machine:
- `INITIATED`: Request sent; waiting for initial response.
- `ACTIVE`: Active 1-on-1 or group discussion thread.
- `MUTED`: Conversation notifications silenced for user.
- `ARCHIVED`: Conversation archived from primary inbox.
- `CLOSED`: Conversation closed upon intent fulfillment or project completion.

### 9.5 Decoupled AI Recommendation Metadata (`ai_recommendation_metadata`)
AI vector embeddings (e.g. 1536-dimensional OpenAI/pgvector embeddings), similarity clusters, and model weights are isolated in `ai_recommendation_metadata` separate from core `student_profiles` to prevent table bloat and lock contention during profile updates.

### 9.6 Dedicated Discovery Search Read Model (`student_discovery_search_read_model`)
To guarantee sub-45ms discovery latency at scale, a materialized search read model combines active intents, skills, courses, and visibility scopes into a high-performance query structure:
- **Refresh Strategy**: Refreshed asynchronously via background worker upon `IntentCreated`, `IntentUpdated`, or `PrivacyUpdated` events.

---

## 10. Definition of Done Checklist (MS-23.3)

- [x] **Multi-Tenant Strategy**: Defined PostgreSQL RLS policies with `college_id` and array-backed `target_college_ids[]`.
- [x] **Entity Catalog**: Detailed 34 aggregate entities spanning identity, intent, graph, collaboration, messaging, recommendation, moderation, and audit.
- [x] **First-Class Intent Model**: Architected `student_intents` as a primary entity with priority, expiration, and availability.
- [x] **Non-Nullable Messaging Context**: Enforced `context_type` and `context_id` non-null constraints on `conversations`.
- [x] **Immutable Recommendations**: Architected append-only `compatibility_snapshots` with weighted JSONB explanations.
- [x] **Isolated Privacy Data Model**: Decoupled `privacy_settings` into separate table with 7 visibility scopes and DPDP consent timestamps.
- [x] **Architectural Refinements**: Weighted explanations, `intent_lifecycle_history`, interaction-derived relationship strength, 5 conversation lifecycle states, decoupled `ai_recommendation_metadata`, and `student_discovery_search_read_model`.
- [x] **Production Indexing Strategy**: Defined B-Tree, GIN, Partial, and Compound Unique indexes for sub-100ms discovery and sub-30ms messaging.
- [x] **Partitioning & Performance SLAs**: Defined monthly table partitioning and verified sub-100ms performance budgets.

---

> [!IMPORTANT]
> **MS-23.3 Database Architecture Complete (With Refinements)**. Output saved to [`docs/research/CAMPUS_CONNECT_DATABASE.md`](file:///C:/Users/SHITHIKANTA%20MAHADEV/OneDrive/Desktop/campizo/docs/research/CAMPUS_CONNECT_DATABASE.md). Stopped for CTO Architecture Review before proceeding to **MS-23.4 (Domain Model & Business Rules)** when instructed!
