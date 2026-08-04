# MS-20.6 — Technical Architecture & Technology Blueprint: Campus Marketplace

## Executive Summary & Architectural Goals

This document specifies the technical architecture, package layout, asynchronous event pipelines, background worker topology, search indexing, caching layers, storage providers, and security controls for the **College Hub Campus Marketplace** (`@college-hub/mod-marketplace`).

The technical blueprint is engineered for:
- **Scalability**: Supporting 100+ colleges, millions of listings, and high-frequency student chat messaging.
- **Asynchronous Decoupling**: Heavy tasks (virus scanning, image optimization, thumbnail generation, search indexing, statistics) offloaded to BullMQ background workers with parallel fan-out processing.
- **High Performance SLAs**: Sub-10ms full-text search and sub-50ms listing detail page rendering.
- **Multi-Tenant Security**: Strict tenant isolation across all layers via `college_id` headers and database Row-Level Security (RLS).

---

## 1. Overall Layered Architecture

```
                                  CLIENT LAYER
               ┌──────────────────────────────────────────────────┐
               │ Next.js 16 App Router (apps/web)                │
               └────────────────────────┬─────────────────────────┘
                                        │ HTTP REST (x-college-id, JWT)
                                        ▼
                                 FASTIFY HTTP LAYER
               ┌──────────────────────────────────────────────────┐
               │ Fastify Controllers & Zod DTO Validation          │
               │ (modules/marketplace/src/controllers)            │
               └────────────────────────┬─────────────────────────┘
                                        │
                                        ▼
                                APPLICATION LAYER
               ┌──────────────────────────────────────────────────┐
               │ Use Cases & CQRS Read Query Services             │
               │ (modules/marketplace/src/use-cases & queries)   │
               └───────────┬──────────────────────────┬───────────┘
                           │                          │
                           ▼                          ▼
                     DOMAIN LAYER                EVENT BUS
              ┌─────────────────────────┐  ┌───────────────────────┐
              │ Aggregate Roots &       │  │ EventBus (Redis/Bus)  │
              │ Business Invariants     │  └──────────┬────────────┘
              └────────────┬────────────┘             │
                           │                          ▼
                           ▼                  BULLMQ BACKGROUND WORKERS
                     REPOSITORIES         ┌───────────────────────────────┐
              ┌─────────────────────────┐ │ - VirusScanWorker             │
              │ Drizzle ORM Repository  │ │ - ImageOptimizationWorker     │
              │ (modules/marketplace)   │ │ - SearchIndexerWorker         │
              └────────────┬────────────┘ │ - StatisticsWorker            │
                           │              │ - ReservationExpiryWorker     │
                           ▼              └───────────────────────────────┘
                     DATA & STORAGE
              ┌───────────────────────────────────────────────────┐
              │ PostgreSQL (RLS) | Redis L2 Cache | AWS S3/MinIO  │
              └───────────────────────────────────────────────────┘
```

---

## 2. Monorepo Package Structure

```
modules/marketplace/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                        # Public module exports
│   ├── schema/
│   │   └── marketplace.schema.ts       # Drizzle ORM schemas (20 entities)
│   ├── domain/
│   │   ├── events.ts                   # Domain event interfaces & constants
│   │   ├── invariants.ts               # Domain invariant functions
│   │   └── repository.interface.ts     # Repository contracts
│   ├── errors/
│   │   ├── domain-errors.ts            # Domain exceptions
│   │   ├── application-errors.ts       # Application & HTTP mapped errors
│   │   └── http-error-handler.ts       # Fastify error handler & ApiV1Response
│   ├── validators/
│   │   └── marketplace.validators.ts   # Zod input DTO validation schemas
│   ├── repositories/
│   │   ├── drizzle-marketplace.repo.ts # Production Drizzle ORM repositories
│   │   └── in-memory-marketplace.repo.ts# In-memory test doubles
│   ├── use-cases/
│   │   └── marketplace.use-cases.ts    # Command use cases (18 use cases)
│   ├── queries/
│   │   └── marketplace.queries.ts      # CQRS read query services (8 queries)
│   ├── controllers/
│   │   ├── listing.controller.ts       # Fastify Listing REST handlers
│   │   ├── offer.controller.ts         # Fastify Offer REST handlers
│   │   ├── reservation.controller.ts   # Fastify Reservation REST handlers
│   │   ├── chat.controller.ts          # Fastify Chat REST handlers
│   │   └── seller.controller.ts        # Fastify Seller Profile REST handlers
│   └── workers/
│       ├── virus-scan.worker.ts        # Malware detection background worker
│       ├── image-optim.worker.ts       # WebP image compression worker
│       ├── search-indexer.worker.ts    # Full-text search indexer worker
│       ├── statistics.worker.ts        # Bayesian score & stats worker
│       ├── reservation-expiry.worker.ts# 24-hour reservation timeout worker
│       └── event-router.ts             # Domain Event Router & BullMQ dispatch
└── test/
    ├── domain-and-schema.test.ts
    ├── application-layer.test.ts
    ├── api-integration.test.ts
    └── worker-pipeline.test.ts
```

---

## 3. Asynchronous Parallel Fan-Out Pipeline

```
                       [UploadCompleted Event]
                                  │
                                  ▼
                          [VirusScanWorker]
                                  │
                                  ▼
                         [VirusScanPassed]
        ┌─────────────────┬───────┴────────┬──────────────────┐
        ▼                 ▼                ▼                  ▼
[ImageOptimWorker] [SearchIndexer] [StatisticsInit] [MetadataExtraction]
        └─────────────────┬───────┬────────┴──────────────────┘
                          ▼       ▼
                     [Listing Status: PUBLISHED (Ready)]
```

### 3.1 Pipeline Step Breakdown
1. **Direct S3 Upload**: Client uploads binary to pre-signed S3 URL and emits `UploadCompleted`.
2. **VirusScanWorker**: Performs malware & integrity checks. Upon clean scan, emits `VirusScanPassed`.
3. **Parallel Fan-Out Execution**:
   - **`ImageOptimizationWorker`**: Converts photos to WebP thumbnails in parallel.
   - **`SearchIndexerWorker`**: Indexes metadata into GIN full-text catalog in parallel.
   - **`StatisticsInit`**: Initializes view, bookmark, and score counters in parallel.
   - **`MetadataExtraction`**: Extracts category/EXIF metadata in parallel.
4. **Completion Convergence**: Upon completion of fan-out jobs, item status updates to `PUBLISHED` (Listing Ready).

---

## 4. Offer, Chat & Reservation Pipeline

```
[Buyer Submits Offer Card] ──► [OfferCreated Event] ──► [Chat Message Appended]
                                                               │
                                                               ▼
[Seller Taps "Accept"] ◄─────────────────────────── [Notification Dispatched]
        │
        ▼
[OfferAccepted Event] ──► [ReservationCreated Event] ──► [Listing Status: RESERVED (24h)]
                                                               │
                                                               ▼
                                                  [ReservationExpiryWorker (24h)]
                                                               │
                                         ┌─────────────────────┴─────────────────────┐
                                         ▼                                           ▼
                              [Handover Complete (SOLD)]                  [Expired ➔ PUBLISHED]
```

---

## 5. Background Workers & Queue SLA Matrix

| Worker Name | Trigger Event | Job Goal | Retry Policy & Backoff | Idempotency Key |
| :--- | :--- | :--- | :--- | :--- |
| **VirusScanWorker** | `UploadCompleted` | Scan binary for viruses | 3 retries, exponential backoff (2s, 4s, 8s) | `job-scan-{sha256Hash}` |
| **ImageOptimizationWorker**| `VirusScanPassed` | Generate WebP variants (Parallel) | 3 retries, exponential backoff (2s, 4s, 8s) | `job-img-{fileId}` |
| **SearchIndexerWorker** | `VirusScanPassed` | Index in search catalog (Parallel)| 5 retries, exponential backoff (1s, 2s, 4s) | `job-idx-{listingId}` |
| **StatisticsWorker** | `ResourceVoteAdded` / `View` | Compute Bayesian score | 3 retries, linear backoff (5s) | `job-stat-{listingId}` |
| **ReservationExpiryWorker**| `ReservationCreated` | Auto-expire after 24h | 5 retries, exponential backoff (10s, 30s) | `job-res-exp-{reservationId}` |

---

## 6. Multi-Level Caching Blueprint

1. **L1 Memory Cache**: Node.js in-memory LRU cache for hot global taxonomies (`marketplace_categories`, `marketplace_conditions`) with 1-hour TTL.
2. **L2 Redis Cache**:
   - `marketplace:college:{collegeId}:listing:{listingId}` (TTL 15 mins)
   - `marketplace:college:{collegeId}:trending` (TTL 5 mins)
3. **Targeted Invalidation**: Mutating a listing invalidates specific key patterns (`marketplace:college:{collegeId}:listing:{listingId}`) without full cache flushes.

---

## 7. Storage Provider Abstraction (`StorageProvider`)

```typescript
export interface StorageProvider {
  generatePreSignedUploadUrl(key: string, mimeType: string, expiresInSeconds: number): Promise<string>;
  getPublicUrl(key: string): string;
  deleteFile(key: string): Promise<boolean>;
}
```
Supports **AWS S3**, **MinIO**, **Cloudflare R2**, and local filesystem drivers seamlessly via dependency injection.

---

## 8. Performance SLAs & Metrics

| Operation | Target SLA (p95) | Degradation Fallback |
| :--- | :---: | :--- |
| **Keyword Search** | $< 10$ ms | Fallback to cached trending list |
| **Listing Detail Render** | $< 50$ ms | Serve stale L2 Redis snapshot |
| **Offer Submission** | $< 100$ ms | Queue offer event asynchronously |
| **Chat Message Polling** | $< 50$ ms | Serve cached conversation summary |
| **Pre-Signed Upload URL** | $< 100$ ms | Retry pre-signed token generation |

---

## Deliverables & Sign-Off Summary

* ✅ **Parallel Fan-Out Listing Pipeline**: `UploadCompleted` $\rightarrow$ `VirusScanWorker` $\rightarrow$ `VirusScanPassed` $\rightarrow$ Parallel execution of `ImageWorker`, `SearchIndexer`, `StatisticsInit`, `MetadataExtraction` $\rightarrow$ `Listing Ready`.
* ✅ **Monorepo Package Layout**: Defined `@college-hub/mod-marketplace` structure.
* ✅ **Multi-Level Caching**: L1 in-memory + L2 Redis key invalidation blueprint.
* ✅ **Storage Provider Abstraction**: S3 / MinIO / R2 pre-signed direct upload flow.
* ✅ **Zero Code Violation**: Pure technical architecture specification document.

> [!IMPORTANT]
> **MS-20.6 Architecture Refinement Complete**. Ready for **MS-20.7 (Visual Design System & UI/UX Specification)**.
