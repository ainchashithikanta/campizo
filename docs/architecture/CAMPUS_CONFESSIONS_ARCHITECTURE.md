# MS-21.6 — Technical Architecture & Technology Blueprint: Campus Confessions

## Executive Summary & System Architecture

This document defines the production Technical Architecture, Modular Monorepo Package Layout, Request Flow, CQRS Read Models, Anonymous Identity Security Boundary, Asynchronous Event Pipeline, Multi-Tier Caching Strategy, and SLA Latency Targets for the **College Hub Campus Confessions** module.

The system is engineered for **100% multi-tenant isolation**, **high read throughput**, **blind anonymous moderation**, and **sub-100ms feed delivery**.

---

## 1. Package Structure & Architectural Boundaries

### 1.1 Package Location & Workspace Identification
- **Package Name**: `@college-hub/mod-confessions`
- **Module Location**: `modules/confessions`

```
modules/confessions/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                         # Public Module Entrypoint
│   ├── controllers/                     # Fastify HTTP Route Handlers
│   ├── validators/                      # Zod Validation Schemas
│   ├── queries/                         # CQRS Composite Read Models
│   ├── use-cases/                       # Command Use Cases & Business Logic
│   ├── domain/                          # Domain Entities, Invariants & Events
│   ├── repositories/                    # Drizzle ORM & In-Memory Repositories
│   ├── providers/                       # Anonymous Identity & Search Provider Interfaces
│   ├── workers/                         # BullMQ Background Processing Workers
│   ├── errors/                          # Domain & Application Error Mappers
│   └── events/                          # Event Bus Router & Dispatcher
└── test/                                # Vitest Integration & Unit Test Suites
```

---

## 2. Two-Stage PII Scanning & Command Pipeline Flow

```
[Client Web App]
    │ 1. Client-Side Lightweight Regex PII Check (Immediate UX feedback)
    │ 2. HTTP POST /api/v1/confessions (x-college-id, Bearer JWT)
    ▼
[Fastify REST Router]
    │ 3. Server Validation (Zod + Distributed Redis Rate Limiter)
    ▼
[Confession Use Case]
    │ 4. Request Thread Pseudonym from AnonymousIdentityService
    │ 5. Persist Aggregate via ConfessionRepository
    │ 6. Publish Domain Event: ConfessionCreated
    ▼
[PiiScanWorker]
    │ 7. Asynchronous Deep PII Scan (Source of Truth)
    │ 8. Passed? ➔ Transition to PUBLISHED & Emit ConfessionPublished
```

---

## 3. Independent Feed Caching Strategy (Redis Keys)

```
                                REDIS FEED CACHING PATTERNS
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Trending Feed: `confessions:{college}:feed:trending`                            │
│ Latest Feed:   `confessions:{college}:feed:latest`                              │
│ Category Feed: `confessions:{college}:feed:category:{categoryId}`               │
│ Detail Model:  `confessions:{college}:detail:{confessionId}`                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```
- **Targeted Invalidation**: Updating a single confession invalidates only `confessions:{college}:detail:{id}`. Global feed keys are never invalidated in bulk.

---

## 4. Incremental Ranking & Asynchronous Workers

1. **`PiiScanWorker`**: Server-side deep PII scanner.
2. **`ModerationWorker`**: 3-report quarantine circuit breaker.
3. **`StatisticsWorker`**: Sole writer to `confession_statistics`.
4. **`RankingWorker`**: Incremental ranking worker (recalculates affected confession score on vote/comment without full-catalog recalculation).
5. **`SearchIndexerWorker`**: Interfaced via `SearchProvider` (PostgreSQL FTS initially, abstraction ready for Meilisearch/OpenSearch).
6. **`NotificationWorker`**: Prepares notification payloads; delegates actual delivery (push, email, socket) to platform-wide notification service.
7. **`DLQManager`**: Handles failed jobs with exponential backoff (`baseMs * 2^(attempt-1)` up to 30s max).

---

## 5. Production Telemetry & Operational Metrics

- **`confessions_created_total`**: Counter of posts created per hour.
- **`comments_created_total`**: Counter of comments added per hour.
- **`moderation_queue_depth`**: Gauge of open severity cases in moderation queue.
- **`moderation_resolution_duration_seconds`**: Histogram of average moderation response time.
- **`quarantine_circuit_breaker_total`**: Counter of 3-report auto-quarantined posts.
- **`pii_detection_blocked_total`**: Counter of PII attempts blocked by scanner.
- **`feed_cache_hit_ratio`**: Ratio of Redis feed cache hits vs misses.

---

## Deliverables & Sign-Off Summary

* ✅ **Two-Stage PII Scanner**: Client UX check $\rightarrow$ Server validation $\rightarrow$ `PiiScanWorker` source of truth.
* ✅ **Independent Feed Caching**: Granular Redis keys (`confessions:{college}:feed:trending`) without blanket invalidation.
* ✅ **Incremental Ranking Worker**: Recalculates single confession score on vote events.
* ✅ **Abstract SearchProvider Interface**: PostgreSQL FTS abstraction ready for future Meilisearch migration.
* ✅ **Decoupled Notification Delivery**: `NotificationWorker` prepares payloads for platform service.
* ✅ **Distributed Redis Rate Limiting**: Distributed rate limiter across multiple API nodes.

> [!IMPORTANT]
> **MS-21.6 Approved with Refinements**. Ready for **MS-21.7 (Visual Design System & UI/UX Specification)**.
