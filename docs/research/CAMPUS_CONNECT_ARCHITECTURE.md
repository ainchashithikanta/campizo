# Campus Connect — Production Technical Architecture & Blueprint

**Module Package**: `@college-hub/mod-connect`  
**Output Location**: `modules/connect/`  
**Document Type**: Technical Architecture & Infrastructure Blueprint  
**Status**: 🟢 **FINAL PRODUCTION ARCHITECTURE SPECIFICATION**  
**Target Platform**: College Hub Monorepo Modular Kernel Architecture

---

> [!IMPORTANT]
> **Mandatory CTO Architectural Invariants**:
>
> 1. **Sole Intent Authority**: `StudentIntentService` is the sole authority over student intent lifecycles, availability, and expiration.
> 2. **Asynchronous Recommendations**: Recommendation generation executes out-of-band via background BullMQ workers.
> 3. **Immutable Messaging Context**: Every conversation and message thread MUST reference a non-null, immutable `ConversationContext`.
> 4. **Stateless & Idempotent Workers**: All 10 background workers are stateless and idempotent, supporting horizontal scaling.
> 5. **Immutable Recommendation Snapshots**: `RecommendationSnapshot` instances are append-only and cannot be mutated in place.
> 6. **Pre-Execution Privacy Enforcement**: Privacy rules (`PrivacyGuard`) are evaluated prior to recommendation generation or search index query processing.
> 7. **Feature-Flag Driven Execution**: Feature flags influence runtime execution paths without modifying database schemas or API response contracts.
> 8. **Unified Event Envelope**: Every domain event contains `requestId`, `traceId`, `eventId`, `collegeId`, and `timestamp`.
> 9. **Thin Controllers**: Controllers contain ZERO business logic, delegating 100% of execution to Use Cases and Application Services.
> 10. **Documented SLAs**: Guaranteed performance budgets for all queries, recommendations, and messaging pipelines.

---

## 1. Package Architecture (`@college-hub/mod-connect`)

### 1.1 Folder Structure & Responsibilities

```
modules/connect/
├── package.json                   # Module dependencies & scripts
├── tsconfig.json                   # Strict TypeScript compiler options
├── src/
│   ├── index.ts                   # Module entry point & Fastify plugin export
│   ├── controllers/               # Thin Fastify HTTP request handlers (0 business logic)
│   ├── validators/                # Zod request payload & header validation schemas
│   ├── queries/                   # CQRS Read Model query handlers & search indexers
│   ├── use-cases/                 # CQRS Write Use Cases & command handlers
│   ├── domain/                    # Pure Domain Aggregates, Value Objects & Domain Events
│   ├── repositories/              # Repository interfaces & Drizzle ORM implementations
│   ├── providers/                 # External service abstractions (Redis, Search, LLM AI)
│   ├── workers/                   # BullMQ background worker implementations
│   ├── events/                    # Event envelope schemas, publishers & event router
│   ├── errors/                    # Typed domain & infrastructure error classes
│   ├── services/                  # Application Layer orchestrators
│   │   ├── matching/              # Vector compatibility calculation & snapshot engines
│   │   ├── messaging/             # Context-bound messaging & conversation service
│   │   ├── notifications/         # Multi-channel notification publisher
│   │   ├── moderation/            # Safety pre-filtering, quarantine & reputation engine
│   │   └── privacy/               # Visibility scope resolution & privacy enforcement
│   └── sdk/                       # Reusable client SDK client interface implementation
└── test/                          # Unit, integration, performance & chaos test suites
```

---

## 2. Layered Architecture & Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LAYERED ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Frontend Layer: Next.js 16 App Router / React Native Mobile SDK      │
├─────────────────────────────────────────────────────────────────────────┤
│                                   │ HTTP API / WebSocket (ApiV1Response<T>)
│                                   ▼
│ 2. API Gateway & Fastify Layer: Thin Fastify Controllers               │
│    • [RequestContext] ➔ [Idempotency] ➔ [RBAC] ➔ [RateLimiter]          │
├─────────────────────────────────────────────────────────────────────────┤
│                                   │ Command / Query Dispatch
│                                   ▼
│ 3. Application & Use-Case Layer: Command Handlers & App Services       │
│    • StudentIntentService, ConversationService, PrivacyGuard            │
├─────────────────────────────────────────────────────────────────────────┤
│                                   │ Domain Method Executions
│                                   ▼
│ 4. Pure Domain Layer: Aggregate Roots, Invariants & State Machines     │
│    • StudentIntent, Conversation, RecommendationSnapshot                │
├─────────────────────────────────────────────────────────────────────────┤
│                                   │ Repository Persistence
│                                   ▼
│ 5. Persistence Layer: Repositories & PostgreSQL 16+ Database (RLS)     │
├─────────────────────────────────────────────────────────────────────────┤
│                                   │ Domain Event Publishing (Pub/Sub)
│                                   ▼
│ 6. Asynchronous Background Layer: BullMQ Workers & Event Router         │
│    • RecommendationWorker ➔ SearchIndexerWorker ➔ NotificationWorker    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Intent Engine Architecture

`StudentIntentService` is the sole domain authority governing intent creation, prioritization, availability, and expiration:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INTENT ENGINE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. StudentIntentService: Main application service executing commands    │
│    `createIntent()`, `activateIntent()`, `pauseIntent()`, `fulfill()`.  │
│ 2. IntentScheduler: Schedules expiration timers via Redis BullMQ.       │
│ 3. IntentExpiryWorker: Evaluates active intents against `expires_at`.   │
│    Emits `IntentExpired` event upon expiration.                         │
│ 4. IntentHistory: Appends immutable audit records to                    │
│    `intent_lifecycle_history` on state transitions.                      │
│ 5. IntentPrioritizer: Scores intent urgency (1 = Urgent, 5 = Casual)   │
│    to rank discovery feed cards.                                        │
│ 6. IntentMatching: Initiates compatibility calculations.                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Asynchronous Recommendation Pipeline

Recommendations execute out-of-band via background BullMQ workers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDATION GENERATION PIPELINE                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Intent Updated Event (`IntentActivated`)                               │
│        │                                                                │
│        ▼                                                                │
│  [PrivacyGuard & Tenant Isolation Filter]                               │
│        │ Filters out `HIDDEN` profiles and blocked peers                │
│        ▼                                                                │
│  [Compatibility Calculator]                                             │
│        │ Academic (0.45) + Skill (0.35) + Interest (0.20)               │
│        ▼                                                                │
│  [Recommendation Generator]                                             │
│        │ Calculates top match candidates for active intent               │
│        ▼                                                                │
│  [Explanation Generator]                                                │
│        │ Builds structured `weightedReasons` objects                    │
│        ▼                                                                │
│  [Recommendation Snapshot (Immutable)]                                  │
│        │ Writes append-only record to `compatibility_snapshots`         │
│        ▼                                                                │
│  [Notification Queue]                                                   │
│        │ Dispatches `RecommendationGenerated` notification event        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Messaging Architecture & Context Engine

Direct messaging requires a validated, non-null, immutable `ConversationContext`:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MESSAGING SUBSYSTEM COMPONENTS                   │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. ConversationService: Orchestrates chat creation & thread fetching.    │
│ 2. ContextResolver: Resolves & verifies originating intent reference    │
│    (`STUDY_INTENT`, `PROJECT_INTENT`, `HACKATHON_INTENT`, etc.).        │
│ 3. PermissionGuard: Verifies non-blocked status & active connection.    │
│ 4. MessageService: Handles message dispatch, profanity filtering,       │
│    and soft-deletion (`is_deleted = true`).                             │
│ 5. ReadReceiptService: Updates per-member `last_read_at` timestamps.    │
│ 6. NotificationPublisher: Dispatches real-time WebSocket / Push alerts. │
│ 7. ConversationArchiver: Archives inactive threads after 30 days.       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Search Architecture & Read Models

Provides high-throughput search and discovery across campus entities:

- **Search Indexers**:
  - `DiscoveryIndex`: Active intent discovery feed read model (`student_discovery_search_read_model`).
  - `StudentIndex`: Student major, skill, and interest search index.
  - `IntentIndex`: Course-specific and skill-specific intent lookup index.
  - `ClubIndex` & `EventIndex`: Campus organization and event attendee indexes.
- **Provider Abstraction (`ISearchProvider`)**: Allows swapping local PostgreSQL/pgvector search with Meilisearch or Elasticsearch without refactoring application services.

---

## 7. Background Worker Architecture (10 Dedicated Workers)

All background workers are stateless, idempotent, and horizontally scalable:

1. **`RecommendationWorker`**: Executes multi-dimensional vector matching and creates immutable snapshots.
2. **`IntentExpiryWorker`**: Scans for expired intents and transitions status to `EXPIRED`.
3. **`NotificationWorker`**: Delivers multi-channel push, email, and WebSocket alerts.
4. **`SearchIndexerWorker`**: Asynchronously updates search read models upon entity mutations.
5. **`TrustScoreWorker`**: Computes non-public student platform reputation scores based on report frequency.
6. **`RelationshipWorker`**: Derives `RelationshipStrength` metrics from interaction logs.
7. **`AnalyticsWorker`**: Aggregates daily feature evaluation and usage statistics.
8. **`CleanupWorker`**: Purges soft-deleted messages beyond 30-day retention policies.
9. **`ModerationWorker`**: Processes reported user evidence payloads and auto-quarantines accounts.
10. **`ActivityWorker`**: Flushes real-time campus activity ticker logs to Redis feed pools.

---

## 8. Event Routing Architecture & Event Envelope

### 8.1 Unified Event Envelope

Every domain event dispatched across the system adheres to a strict envelope structure:

```ts
export interface EventEnvelope<T = unknown> {
  eventId: string; // UUIDv4
  requestId: string; // Originating HTTP Request ID
  traceId: string; // Distributed Tracing ID
  collegeId: string; // Tenant Isolation Identifier
  eventType: string; // Domain Event Type Name
  timestamp: string; // ISO 8601 UTC Timestamp
  payload: T; // Event Specific Payload Data
}
```

### 8.2 Event Routing Table

| Event Type                | Source Component          | Target Worker Queues                            | Description                                        |
| :------------------------ | :------------------------ | :---------------------------------------------- | :------------------------------------------------- |
| `IntentCreated`           | `StudentIntentService`    | `connect:search`, `connect:recs`                | Triggers search indexing & match generation        |
| `IntentActivated`         | `StudentIntentService`    | `connect:recs`, `connect:activity`              | Triggers background recommendation pipeline        |
| `IntentExpired`           | `IntentExpiryWorker`      | `connect:search`, `connect:notifications`       | Updates search index & notifies student            |
| `ConnectionRequested`     | `NetworkGraphService`     | `connect:notifications`                         | Dispatches connection request notification         |
| `ConnectionAccepted`      | `NetworkGraphService`     | `connect:chat`, `connect:relationship`          | Unlocks messaging & computes relationship score    |
| `ConversationCreated`     | `ConversationService`     | `connect:chat`, `connect:audit`                 | Creates context-bound message thread               |
| `MessageSent`             | `MessageService`          | `connect:notifications`, `connect:relationship` | Triggers push alert & updates interaction strength |
| `RecommendationGenerated` | `RecommendationWorker`    | `connect:notifications`                         | Delivers explainable match alert                   |
| `RecommendationArchived`  | `RecommendationWorker`    | `connect:audit`                                 | Archives stale recommendation snapshot             |
| `PrivacyUpdated`          | `ProfilePrivacyService`   | `connect:search`, `connect:recs`                | Invalidates cached discovery read models           |
| `ModerationCaseOpened`    | `ModerationSafetyService` | `connect:safety`                                | Triggers safety review & auto-quarantine           |
| `ActivityRecorded`        | `ActivityWorker`          | `connect:activity`                              | Appends event to live campus ticker                |
| `FeatureDisabled`         | `FeatureFlagGuard`        | `connect:search`                                | Removes disabled feature items from discovery      |
| `FeatureEnabled`          | `FeatureFlagGuard`        | `connect:search`                                | Re-indexes feature items into discovery            |

---

## 9. Multi-Tier Caching Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MULTI-TIER CACHING PIPELINE                     │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. L1 Memory Cache (Node.js LRU):                                       │
│    • Stores feature flag evaluations & student privacy scopes (60s TTL).│
├─────────────────────────────────────────────────────────────────────────┤
│                                   │ Cache Miss
│                                   ▼
│ 2. L2 Distributed Cache (Redis Cluster):                                │
│    • Stores active intent discovery feeds, recommendations, and session │
│      presence tokens (5m TTL).                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                   │ Cache Miss
│                                   ▼
│ 3. Persistent Database (PostgreSQL 16+ Read Replicas):                  │
│    • Master database handles transactional writes; read replicas serve  │
│      cache miss queries.                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Cache Invalidation Policy**: Event-driven invalidation via Redis Pub/Sub (`PrivacyUpdated` -> Purge L1/L2 discovery cache for student; `IntentUpdated` -> Purge recommendation cache).

---

## 10. Performance Targets & SLA Guarantees

| Operations / Query Pipeline   | SLA Target        | Optimization Strategy                                                          |
| :---------------------------- | :---------------- | :----------------------------------------------------------------------------- |
| **Intent Evaluation**         | $< 20\text{ ms}$  | L1 In-Memory Feature Flag & Policy Guard Evaluation                            |
| **Profile Load**              | $< 50\text{ ms}$  | L2 Redis Cache with composite primary key lookup                               |
| **Search Query**              | $< 80\text{ ms}$  | GIN & Partial Indexing on `student_discovery_search_read_model`                |
| **Recommendation Retrieval**  | $< 100\text{ ms}$ | Precomputed immutable `compatibility_snapshots`                                |
| **Recommendation Generation** | $< 150\text{ ms}$ | Asynchronous BullMQ background worker execution                                |
| **Messaging Lookup**          | $< 30\text{ ms}$  | Partitioned message table with composite index `(conversation_id, created_at)` |
| **Notification Preparation**  | $< 30\text{ ms}$  | Pre-formatted notification templates & Redis queue dispatch                    |

---

## 11. Resilience & Fault Tolerance Architecture

- **Dead Letter Queue (DLQ)**: Failed worker jobs are routed to `connect:dlq` after 3 exponential backoff retries.
- **Idempotency Manager**: Idempotency keys (`Idempotency-Key` header) cached in Redis for 24 hours to prevent duplicate writes.
- **Circuit Breaker Pattern**: `CircuitBreaker` protects external AI providers and search indexing services (Transitions: `CLOSED` $\rightarrow$ `OPEN` on 5 consecutive failures $\rightarrow$ `HALF_OPEN` after 30s).
- **Graceful Recovery & Replay**: `EventReplayer` supports replaying domain events from PostgreSQL audit logs to rebuild search indexes or recommendation snapshots.

---

## 12. Security, Privacy & Audit Architecture

- **Privacy Guard Enforcement**: `PrivacyGuard` validates `VisibilityScope` prior to search index rendering or recommendation scoring.
- **Tenant Isolation**: Every database query includes `WHERE college_id = current_setting('app.current_college_id')` enforced via PostgreSQL RLS.
- **Rate Limiting**: Endpoint-specific rate limiting (e.g. Max 5 connection requests per 24 hours) managed via Redis token buckets.
- **Immutable Audit Logging**: Append-only `audit_logs` record all administrative interventions, safety reports, and privacy configuration changes.

---

## 13. Definition of Done Checklist (MS-23.6)

- [x] **Package Architecture**: Defined `@college-hub/mod-connect` structure inside `modules/connect/`.
- [x] **Layered Architecture**: Designed complete flow from Next.js to Fastify, Application, Domain, Repositories, DB, Workers, Notifications, Search, Recommender.
- [x] **Intent Engine**: Defined `StudentIntentService` as the sole authority over intents with scheduler, expiry worker, and prioritizer.
- [x] **Asynchronous Recommendation Pipeline**: Defined out-of-band compatibility calculation and immutable snapshot creation.
- [x] **Messaging Architecture**: Enforced immutable, non-null `ConversationContext` and permission guards.
- [x] **Search Architecture**: Defined discovery, student, intent, club, and event indexes with search provider abstraction.
- [x] **10 Background Workers**: Specified stateless, idempotent BullMQ workers.
- [x] **Event Routing Architecture**: Defined unified event envelope (`requestId`, `traceId`, `eventId`, `collegeId`, `timestamp`) and routing table.
- [x] **Multi-Tier Caching Strategy**: Designed L1 Memory $\rightarrow$ Redis L2 $\rightarrow$ PostgreSQL Read Replicas with event invalidation.
- [x] **Performance SLAs**: Documented SLAs for intent eval (<20ms), profile (<50ms), recs (<100ms/<150ms), messaging (<30ms), notifications (<30ms), search (<80ms).
- [x] **Resilience & Security Architecture**: Specified DLQ, Idempotency, Circuit Breaker, Privacy Guard, and RLS tenant isolation.

---

> [!IMPORTANT]
> **MS-23.6 Technical Architecture Complete**. Output saved to [`docs/research/CAMPUS_CONNECT_ARCHITECTURE.md`](file:///C:/Users/SHITHIKANTA%20MAHADEV/OneDrive/Desktop/campizo/docs/research/CAMPUS_CONNECT_ARCHITECTURE.md).
> All 6 Campus Connect research and architecture specification milestones (**MS-23.1 to MS-23.6**) are now 100% complete! Stopped for CTO Final Module Review!
