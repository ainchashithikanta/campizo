# College Hub: Master Phased Implementation Roadmap (58 Milestones)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Master Engineering Implementation Roadmap (FROZEN ARCHITECTURE)
- **Document Version**: 3.0.0-FROZEN
- **Total Milestones**: 58 Granular, Independently Testable Milestones across 10 Execution Phases
- **Target Effort Per Milestone**: 1–3 Days
- **Governance Rule**: Every milestone MUST satisfy its mandatory Definition of Done (DoD) before sign-off and progression to the next milestone.

---

## Universal Mandatory Definition of Done (DoD)

For ANY milestone to be declared complete, ALL 8 quality criteria MUST be verified and checked:

- [ ] **1. Build Passes**: Monorepo compilation succeeds cleanly via `pnpm build` with 0 errors.
- [ ] **2. Tests Pass**: Unit and integration tests pass cleanly via `pnpm test` (min >85% coverage threshold).
- [ ] **3. Documentation Updated**: All architectural diagrams, TSDoc comments, and markdown guides updated.
- [ ] **4. Security Review Completed**: Boundary Zod validation, tenant RLS policies, and secret checks verified.
- [ ] **5. Lint Passes**: ESLint checks pass cleanly via `pnpm lint` with 0 warnings/errors.
- [ ] **6. Formatting Passes**: Prettier check succeeds cleanly via `pnpm format`.
- [ ] **7. No Critical Known Bugs**: Zero unhandled exceptions or unresolved critical regressions.
- [ ] **8. Ready for Review**: Increment is fully functional, self-contained, and ready for principal architect review.

---

## Phase 1: Infrastructure & Monorepo Foundation

### MS-01: Monorepo Root Tooling & Turborepo Task Pipeline

- **Objective**: Establish monorepo workspace configuration, pnpm workspace resolution, and Turborepo build task caching.
- **Scope**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `tsconfig.json`.
- **Deliverables**: Verified root scripts (`build`, `dev`, `lint`, `type-check`, `format`), pnpm workspace setup.
- **Dependencies**: None.
- **Acceptance Criteria**: Running `pnpm build` across workspace succeeds with zero warnings.
- **Estimated Effort**: 1 Day.
- **Risks**: Node/pnpm version mismatch across developer machines.
- **Verification Checklist**:
  - [ ] `pnpm --version` matches package.json engine constraint (>=9.0.0).
  - [ ] `pnpm build` executes Turbo build graph cleanly.

### MS-02: Local Infrastructure Stack Setup

- **Objective**: Configure local Docker Compose infrastructure stack for offline development.
- **Scope**: `docker-compose.yml` (PostgreSQL 16 + pgvector, Redis 7, MinIO S3, Mailpit).
- **Deliverables**: Executable `docker-compose.yml`, health checks, volume persistent storage setup.
- **Dependencies**: MS-01.
- **Acceptance Criteria**: `docker compose up -d` boots all 4 services with healthy status within 10s.
- **Estimated Effort**: 1 Day.
- **Risks**: Port collisions on developer workstation (5432, 6379, 9000).
- **Verification Checklist**:
  - [ ] `pg_isready` succeeds on 5432.
  - [ ] Redis responds `PONG` on 6379.
  - [ ] MinIO web console accessible on 9001.

### MS-03: Environmental Configuration & Runtime Schema Validation

- **Objective**: Build `@college-hub/config` package providing strict Zod schema validation for environment variables at boot.
- **Scope**: `packages/config/src/env.schema.ts`, `.env.example`.
- **Deliverables**: `@college-hub/config` package, Zod environment parser function.
- **Dependencies**: MS-01.
- **Acceptance Criteria**: Application immediately throws descriptive validation error if required variable is missing.
- **Estimated Effort**: 1 Day.
- **Risks**: Cryptic validation error messages if Zod schema formatting is unhandled.
- **Verification Checklist**:
  - [ ] Unit test verifies invalid ENV variable throws explicit error.
  - [ ] Valid `.env` passes schema check.

### MS-04: Structured Logging & PII Redaction Package

- **Objective**: Build `@college-hub/logger` package wrapping Pino structured logger.
- **Scope**: `packages/logger/src/index.ts`.
- **Deliverables**: `@college-hub/logger` package exporting `createLogger` and `logger`.
- **Dependencies**: MS-01.
- **Acceptance Criteria**: Log output formats as single-line JSON; sensitive keys (`password`, `token`) censored to `[REDACTED]`.
- **Estimated Effort**: 1 Day.
- **Risks**: Performance overhead if Pino redaction paths are inefficient.
- **Verification Checklist**:
  - [ ] Test verifies password string in payload is censored.
  - [ ] Development mode formats pretty logs.

### MS-05: Centralized Domain Types & DTO Contracts

- **Objective**: Build `@college-hub/types` package defining core TypeScript entities, DTOs, and event contracts.
- **Scope**: `packages/types/src/index.ts`.
- **Deliverables**: Exported types for `UserRole`, `TenantContext`, `CollegeTenant`, `DomainEvent`.
- **Dependencies**: MS-01.
- **Acceptance Criteria**: Package builds cleanly and provides shared types imported by API, packages, and modules.
- **Estimated Effort**: 1 Day.
- **Risks**: Circular type imports.
- **Verification Checklist**:
  - [ ] TypeScript compilation verifies zero type errors.

---

## Phase 2: Database & Multi-Tenant Core

### MS-06: Database Schema & Migration Setup

- **Objective**: Build `@college-hub/database` package establishing Drizzle ORM schema definitions and migration tooling.
- **Scope**: `packages/database/src/schema.ts`, `drizzle.config.ts`.
- **Deliverables**: Tables for `college_tenants`, `users`, `audit_logs`.
- **Dependencies**: MS-02, MS-05.
- **Acceptance Criteria**: Running migration scripts successfully creates PostgreSQL tables and foreign key constraints.
- **Estimated Effort**: 2 Days.
- **Risks**: Incompatible column data types between Drizzle and PostgreSQL.
- **Verification Checklist**:
  - [ ] Migrations run cleanly against local Postgres.
  - [ ] Drizzle ORM client exports typed schema.

### MS-07: PostgreSQL Row-Level Security (RLS) Isolation Engine

- **Objective**: Enforce database-level tenant isolation using PostgreSQL Row-Level Security policies.
- **Scope**: `packages/database/src/rls.ts`.
- **Deliverables**: SQL RLS policies on multi-tenant tables (`USING (college_id = CURRENT_SETTING('app.current_college_id', true))`).
- **Dependencies**: MS-06.
- **Acceptance Criteria**: Database query executed without setting tenant variable returns 0 rows belonging to other tenants.
- **Estimated Effort**: 2 Days.
- **Risks**: Connection pool dirty state leaking tenant context if session variables are un-reset.
- **Verification Checklist**:
  - [ ] Test verifies Cross-Tenant access attempt returns 0 rows.

### MS-08: Tenant Context Resolution & Fastify Async Store Hooks

- **Objective**: Implement Fastify request hooks extracting tenant headers/subdomains into `AsyncLocalStorage`.
- **Scope**: `apps/api/src/plugins/tenant-context.ts`.
- **Deliverables**: `TenantContext` middleware resolving tenant configuration from Redis / DB.
- **Dependencies**: MS-03, MS-07.
- **Acceptance Criteria**: Incoming request header `X-College-ID` sets tenant context globally for the request scope.
- **Estimated Effort**: 2 Days.
- **Risks**: Missing fallback for invalid or missing tenant header.
- **Verification Checklist**:
  - [ ] Requests with invalid tenant ID return HTTP 400 Bad Request.

### MS-09: Database Seeding & Ephemeral Test Database Provisioner

- **Objective**: Build database seeder scripts and Testcontainers harness for integration testing.
- **Scope**: `scripts/seed.ts`, `packages/database/test/harness.ts`.
- **Deliverables**: Repeatable seed script populating 3 test college tenants and mock users.
- **Dependencies**: MS-06, MS-08.
- **Acceptance Criteria**: Executing seed script populates test colleges in local database within 3s.
- **Estimated Effort**: 1 Day.
- **Risks**: Seed data pollution during automated test runs.
- **Verification Checklist**:
  - [ ] Seed script executes idempotently without duplicate key errors.

---

## Phase 3: Core Security & Audit System

### MS-10: Tamper-Evident Audit Logging Engine

- **Objective**: Build `@college-hub/security` audit logging engine for recording administrative actions.
- **Scope**: `packages/security/src/audit-logger.ts`.
- **Deliverables**: `StructuredAuditLogger` writing immutable audit events to `audit_logs` table.
- **Dependencies**: MS-04, MS-06.
- **Acceptance Criteria**: Every administrative action emits structured log containing actor ID, role, action, target, IP, and timestamp.
- **Estimated Effort**: 2 Days.
- **Risks**: Failure of audit logger blocking critical administrative workflows.
- **Verification Checklist**:
  - [ ] Test verifies audit record is written on admin action.

### MS-11: RBAC & ABAC Permission Guard Engine

- **Objective**: Implement fine-grained permission authorization guards in `@college-hub/security`.
- **Scope**: `packages/security/src/permissions.ts`.
- **Deliverables**: `PermissionGuard` evaluating user roles and explicit permission strings.
- **Dependencies**: MS-05.
- **Acceptance Criteria**: User lacking required permission (e.g. `admin:college_config`) receives HTTP 403 Forbidden.
- **Estimated Effort**: 2 Days.
- **Risks**: Permission key string typos.
- **Verification Checklist**:
  - [ ] Unit test verifies Super Admin bypass and student role restrictions.

### MS-12: API Rate Limiting & Distributed Redis Protection

- **Objective**: Implement sliding-window rate limiting middleware backed by Redis.
- **Scope**: `apps/api/src/plugins/rate-limiter.ts`.
- **Deliverables**: Fastify rate limiter plugin with per-IP and per-User sliding window rules.
- **Dependencies**: MS-02, MS-08.
- **Acceptance Criteria**: Exceeding 100 requests/min returns HTTP 429 Too Many Requests with `Retry-After` header.
- **Estimated Effort**: 1 Day.
- **Risks**: Redis connection outage blocking non-rate-limited traffic.
- **Verification Checklist**:
  - [ ] Test verifies rate limiter blocks burst requests exceeding threshold.

### MS-13: OWASP Security Headers & CORS Guardrails

- **Objective**: Configure security headers and CORS domain protection middleware.
- **Scope**: `apps/api/src/plugins/security-headers.ts`.
- **Deliverables**: Fastify security plugin enforcing Helmet headers (CSP, HSTS, X-Frame-Options) and origin whitelist.
- **Dependencies**: MS-03.
- **Acceptance Criteria**: Response includes `X-Content-Type-Options: nosniff` and restricts unauthorized CORS origins.
- **Estimated Effort**: 1 Day.
- **Risks**: Overly restrictive CORS blocking mobile app requests.
- **Verification Checklist**:
  - [ ] Header check verifies CSP and CORS policies.

---

## Phase 4: Provider Abstraction Layer

### MS-14: Storage Provider Abstraction & S3 / MinIO Adapter

- **Objective**: Build `@college-hub/providers` storage module with S3 and Local MinIO adapters.
- **Scope**: `packages/providers/src/storage.interface.ts`, `packages/providers/src/storage/s3.provider.ts`.
- **Deliverables**: `IStorageProvider` interface, S3 pre-signed URL generator, file upload/delete functions.
- **Dependencies**: MS-03, MS-05.
- **Acceptance Criteria**: Client successfully uploads file directly to MinIO using pre-signed URL.
- **Estimated Effort**: 2 Days.
- **Risks**: Invalid pre-signed URL expiration calculation.
- **Verification Checklist**:
  - [ ] Pre-signed URL upload test against local MinIO succeeds.

### MS-15: Notification Provider Abstraction & Firebase Adapter

- **Objective**: Build notification provider interface and Firebase/Expo Push notification adapter.
- **Scope**: `packages/providers/src/notification.interface.ts`, `packages/providers/src/notification/expo.provider.ts`.
- **Deliverables**: `INotificationProvider` interface, single and batch push notification dispatcher.
- **Dependencies**: MS-05.
- **Acceptance Criteria**: Push notification payload serialized and dispatched to notification adapter.
- **Estimated Effort**: 2 Days.
- **Risks**: Third-party push API rate limits.
- **Verification Checklist**:
  - [ ] Mock provider test verifies batch push notification array formatting.

### MS-16: Search Provider Abstraction & PostgreSQL / Typesense Adapter

- **Objective**: Build search provider interface supporting full-text indexing and querying.
- **Scope**: `packages/providers/src/search.interface.ts`, `packages/providers/src/search/postgres.provider.ts`.
- **Deliverables**: `ISearchProvider` interface, PostgreSQL full-text search adapter.
- **Dependencies**: MS-06.
- **Acceptance Criteria**: Document indexed and queried returning fuzzy search matches within 50ms.
- **Estimated Effort**: 2 Days.
- **Risks**: Search query syntax injection.
- **Verification Checklist**:
  - [ ] Test verifies document search returns matching collection records.

### MS-17: AI Provider Abstraction & OpenAI / Ollama Adapter

- **Objective**: Build AI provider interface supporting text generation, embeddings, and content moderation.
- **Scope**: `packages/providers/src/ai.interface.ts`, `packages/providers/src/ai/openai.provider.ts`.
- **Deliverables**: `IAIProvider` interface, OpenAI & local Ollama adapters.
- **Dependencies**: MS-03.
- **Acceptance Criteria**: Moderation interface correctly flags toxic text strings; embedding generator returns 1536-dim vector array.
- **Estimated Effort**: 2 Days.
- **Risks**: API key exhaustion or network timeouts on external LLM calls.
- **Verification Checklist**:
  - [ ] Unit test verifies moderation response parsing.

---

## Phase 5: Authentication & Identity Management

### MS-18: User Registration & Student Email Domain Verification

- **Objective**: Build student registration endpoints validating university email domain against tenant whitelist.
- **Scope**: `modules/auth/src/services/registration.service.ts`.
- **Deliverables**: Registration API endpoint (`POST /api/v1/auth/register`), domain validator.
- **Dependencies**: MS-06, MS-08, MS-11.
- **Acceptance Criteria**: Student registering with `@stanford.edu` succeeds; student registering with `@gmail.com` rejected with HTTP 400.
- **Estimated Effort**: 2 Days.
- **Risks**: Email domain whitelist spoofing.
- **Verification Checklist**:
  - [ ] Test verifies domain whitelist enforcement.

### MS-19: Authentication Engine (Password Hashing, JWT & Refresh Tokens)

- **Objective**: Build core authentication service providing password hashing (Argon2id) and JWT session tokens.
- **Scope**: `modules/auth/src/services/auth.service.ts`.
- **Deliverables**: Login endpoint (`POST /api/v1/auth/login`), refresh endpoint (`POST /api/v1/auth/refresh`), token rotation.
- **Dependencies**: MS-03, MS-18.
- **Acceptance Criteria**: Successful login issues short-lived JWT access token (15m) and secure HTTP-Only refresh token cookie.
- **Estimated Effort**: 3 Days.
- **Risks**: Refresh token reuse vulnerability.
- **Verification Checklist**:
  - [ ] Test verifies token rotation invalidates old refresh tokens upon use.

### MS-20: Password Reset, Magic Links & Multi-Factor Auth (MFA)

- **Objective**: Implement password reset token verification via email links.
- **Scope**: `modules/auth/src/services/password-reset.service.ts`.
- **Deliverables**: Password reset request and confirmation endpoints.
- **Dependencies**: MS-19.
- **Acceptance Criteria**: Password reset token generated, emailed via Mailpit, and consumed within 15-minute expiration window.
- **Estimated Effort**: 2 Days.
- **Risks**: Token brute-forcing.
- **Verification Checklist**:
  - [ ] Reset token expires after 15 minutes.

### MS-21: User Profile Management & Preference Center

- **Objective**: Build user profile query/update APIs and notification preference management.
- **Scope**: `modules/auth/src/services/profile.service.ts`.
- **Deliverables**: Profile endpoints (`GET/PATCH /api/v1/users/me`), preference center schema.
- **Dependencies**: MS-19.
- **Acceptance Criteria**: User updates avatar URL or notification toggles; changes persist in database.
- **Estimated Effort**: 2 Days.
- **Risks**: Modifying restricted fields (e.g. role or collegeId) via profile update.
- **Verification Checklist**:
  - [ ] Attempting to update `role` via profile PATCH is stripped by Zod.

---

## Phase 6: Admin Governance & Dynamic Feature Flags

### MS-22: Per-College Tenant Configuration Manager

- **Objective**: Build tenant configuration manager allowing admins to update college themes, allowed email domains, and policies.
- **Scope**: `modules/admin-governance/src/services/tenant-config.service.ts`.
- **Deliverables**: Tenant config management endpoints (`GET/PATCH /api/v1/admin/college-config`).
- **Dependencies**: MS-06, MS-10, MS-11.
- **Acceptance Criteria**: Updating college primary color invalidates tenant Redis configuration cache immediately.
- **Estimated Effort**: 2 Days.
- **Risks**: Invalid hex color formats breaking web CSS rendering.
- **Verification Checklist**:
  - [ ] Audit log entry generated on tenant config update.

### MS-23: Dynamic Per-College Feature Flag Engine

- **Objective**: Build `@college-hub/feature-flags` package checking active module status per tenant.
- **Scope**: `packages/feature-flags/src/index.ts`.
- **Deliverables**: `FeatureFlagEngine` evaluating tenant module permissions in memory and Redis.
- **Dependencies**: MS-08, MS-22.
- **Acceptance Criteria**: API request to disabled module returns HTTP 403 Module Disabled immediately.
- **Estimated Effort**: 2 Days.
- **Risks**: Stale Redis feature flag cache.
- **Verification Checklist**:
  - [ ] Disabling module in tenant config instantly blocks API access.

### MS-24: Platform Admin Governance API & Moderation Queue

- **Objective**: Build global admin APIs for user suspension, content moderation, and audit log auditing.
- **Scope**: `modules/admin-governance/src/services/moderation.service.ts`.
- **Deliverables**: Moderation endpoints (`POST /api/v1/admin/users/:id/ban`, `GET /api/v1/admin/audit-logs`).
- **Dependencies**: MS-10, MS-11.
- **Acceptance Criteria**: Banning user immediately invalidates all active user sessions in Redis.
- **Estimated Effort**: 3 Days.
- **Risks**: Accidental suspension of Super Admin account.
- **Verification Checklist**:
  - [ ] Super Admin accounts protected from ban endpoint execution.

---

## Phase 7: Modular Kernel & Granular Business Modules

### MS-25: Dynamic Auto-Discovery Module Registry Kernel

- **Objective**: Build `@college-hub/core` dynamic module registry for auto-discovering feature modules at boot.
- **Scope**: `packages/core/src/module-registry.ts`.
- **Deliverables**: Dynamic module registry scanning `/modules`, mounting routes, and registering event subscribers.
- **Dependencies**: MS-05, MS-08.
- **Acceptance Criteria**: Server boots and dynamically mounts all valid modules present in `/modules/`.
- **Estimated Effort**: 2 Days.
- **Risks**: Module registration ordering dependencies.
- **Verification Checklist**:
  - [ ] `/health` endpoint lists status of all auto-discovered modules.

### MS-26: Rate My Professor – Schema & Domain Entities

- **Objective**: Define database tables and DTOs for professors, courses, and ratings.
- **Scope**: `modules/rate-my-professor/src/schema.ts`.
- **Deliverables**: Drizzle schema for `professors` and `professor_reviews` with RLS policies.
- **Dependencies**: MS-06, MS-25.
- **Acceptance Criteria**: Migration creates professor tables cleanly.
- **Estimated Effort**: 1 Day.
- **Verification Checklist**: [ ] Schema compiled and exported.

### MS-27: Rate My Professor – Service Layer & Aggregations

- **Objective**: Implement business logic for rating calculations, review submission, and professor directory search.
- **Scope**: `modules/rate-my-professor/src/services/*`.
- **Deliverables**: `ProfessorService` calculating aggregate ratings asynchronously.
- **Dependencies**: MS-26.
- **Acceptance Criteria**: Submitting review updates average score (e.g. 4.5/5.0).
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Unit test verifies calculation math.

### MS-28: Rate My Professor – API Endpoints & Moderation Hooks

- **Objective**: Mount HTTP endpoints and moderation event listeners for Rate My Professor.
- **Scope**: `modules/rate-my-professor/src/routes/*`.
- **Deliverables**: REST endpoints (`GET /api/v1/professors`, `POST /api/v1/professors/:id/reviews`).
- **Dependencies**: MS-27.
- **Acceptance Criteria**: Authenticated student submits review via API; forbidden for unverified guests.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] API integration tests pass.

### MS-29: Materials & PYQs – Schema & Pre-Signed Upload Service

- **Objective**: Build database tables and S3 pre-signed URL upload pipeline for study materials.
- **Scope**: `modules/materials-pyqs/src/schema.ts`, `modules/materials-pyqs/src/services/upload.service.ts`.
- **Deliverables**: Drizzle schema for `study_materials`, S3 upload pre-signer.
- **Dependencies**: MS-14, MS-25.
- **Acceptance Criteria**: Pre-signed URL generated enforcing PDF MIME type and 50MB limit.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Upload pre-signing tested against MinIO.

### MS-30: Materials & PYQs – Catalog Search & Tagging API

- **Objective**: Implement search, filtering by semester/course, and material download endpoints.
- **Scope**: `modules/materials-pyqs/src/routes/*`.
- **Deliverables**: Material query endpoints (`GET /api/v1/materials`).
- **Dependencies**: MS-16, MS-29.
- **Acceptance Criteria**: Querying by course tag returns matching PDFs within 50ms.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Search query returns expected records.

### MS-31: Student Marketplace – Schema & Item Listing Service

- **Objective**: Define database tables and listing creation logic for peer-to-peer textbook trading.
- **Scope**: `modules/marketplace/src/schema.ts`, `modules/marketplace/src/services/item.service.ts`.
- **Deliverables**: `marketplace_items` table schema and listing creation service.
- **Dependencies**: MS-14, MS-25.
- **Acceptance Criteria**: Item created with images and marked `AVAILABLE`.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Marketplace schema passes migration.

### MS-32: Student Marketplace – Buyer-Seller Chat & Status API

- **Objective**: Build marketplace item query, filtering, and seller communication endpoints.
- **Scope**: `modules/marketplace/src/routes/*`.
- **Deliverables**: Marketplace REST endpoints (`GET /api/v1/marketplace/items`, `PATCH /api/v1/marketplace/items/:id/status`).
- **Dependencies**: MS-31.
- **Acceptance Criteria**: Item owner updates status to `SOLD`; item removed from active public feed.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Status transition tested.

### MS-33: Confessions Feed – Schema & AI Moderation Pipeline

- **Objective**: Build anonymous confessions storage and AI toxicity moderation pipeline.
- **Scope**: `modules/confessions/src/schema.ts`, `modules/confessions/src/services/moderation.service.ts`.
- **Deliverables**: `confessions` table schema, AI moderation checker.
- **Dependencies**: MS-17, MS-25.
- **Acceptance Criteria**: Text containing toxic keywords flagged and sent to moderation queue; clean text auto-approved.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] AI moderation pipeline verified.

### MS-34: Confessions Feed – Feed Query & Reaction API

- **Objective**: Build confession feed retrieval with pagination and upvote/reaction endpoints.
- **Scope**: `modules/confessions/src/routes/*`.
- **Deliverables**: Confessions REST endpoints (`GET /api/v1/confessions/feed`, `POST /api/v1/confessions/:id/react`).
- **Dependencies**: MS-33.
- **Acceptance Criteria**: Paginated confessions feed returns active approved items sorted by timestamp or popularity.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Feed pagination tested.

### MS-35: Placement Guidance – Schema & Interview Experience Service

- **Objective**: Build database tables and service for sharing interview experiences and salary insights.
- **Scope**: `modules/placement-guidance/src/schema.ts`.
- **Deliverables**: `placement_experiences` table schema and post creation logic.
- **Dependencies**: MS-25.
- **Acceptance Criteria**: Student posts interview experience tagged by company and batch year.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Schema migration verified.

### MS-36: Placement Guidance – Career Search & Q&A API

- **Objective**: Build search endpoints for querying interview experiences by company and role.
- **Scope**: `modules/placement-guidance/src/routes/*`.
- **Deliverables**: Placement REST endpoints (`GET /api/v1/placement/experiences`).
- **Dependencies**: MS-35.
- **Acceptance Criteria**: Querying "Google" returns verified interview experiences.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Company filter tested.

### MS-37: Blind Date – Preference Questionnaire & Matching Algorithm

- **Objective**: Build questionnaire data collection and batch matching algorithm.
- **Scope**: `modules/blind-date/src/services/matching.service.ts`.
- **Deliverables**: Preference submission endpoint, batch matching worker function.
- **Dependencies**: MS-25.
- **Acceptance Criteria**: Matching worker pairs compatible students based on score vectors without exposing identities.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Matching logic verified with mock datasets.

### MS-38: Blind Date – Encrypted Anonymous Chat Room API

- **Objective**: Build real-time anonymous chat room endpoints with double opt-in identity reveal controls.
- **Scope**: `modules/blind-date/src/routes/*`.
- **Deliverables**: Chat room endpoints (`GET /api/v1/blind-date/chat/:id`, `POST /api/v1/blind-date/reveal-consent`).
- **Dependencies**: MS-37.
- **Acceptance Criteria**: Both users submit reveal consent; real identities revealed; single user consent keeps chat anonymous.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Double opt-in reveal tested.

### MS-39: Notification Engine – Event Handler Registry

- **Objective**: Register domain event subscribers for social, academic, and system notifications.
- **Scope**: `modules/notifications/src/subscribers/*`.
- **Deliverables**: Event subscribers (`USER_REGISTERED`, `CONFESSION_APPROVED`, `MARKETPLACE_MESSAGE`).
- **Dependencies**: MS-15, MS-25.
- **Acceptance Criteria**: Domain event trigger enqueues notification job in BullMQ.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Subscriber triggers queue job.

### MS-40: Notification Engine – In-App Feed & Preference Dispatcher

- **Objective**: Build in-app notification feed endpoints and push/email dispatcher.
- **Scope**: `modules/notifications/src/routes/*`.
- **Deliverables**: Notification feed endpoints (`GET /api/v1/notifications`).
- **Dependencies**: MS-39.
- **Acceptance Criteria**: User views unread notifications; marks item as read.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] In-app feed query verified.

---

## Phase 8: Web Frontend Application (Next.js 15)

### MS-41: UI Design System Component Library (`@college-hub/ui`)

- **Objective**: Build shared cross-platform design system component library.
- **Scope**: `packages/ui/src/components/*`.
- **Deliverables**: Shadcn UI base components (Button, Input, Card, Modal, Select, Avatar, Badge).
- **Dependencies**: MS-05.
- **Acceptance Criteria**: Components render consistently across screen resolutions and support dynamic CSS variables.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Storybook or test harness renders components.

### MS-42: White-Label Theme Hydration Engine

- **Objective**: Implement SSR theme hydration injecting per-college dynamic CSS tokens in Next.js root layout.
- **Scope**: `packages/theme-engine/src/react-provider.tsx`.
- **Deliverables**: React ThemeProvider injecting CSS root variables without Flash of Unstyled Content (FOUC).
- **Dependencies**: MS-41.
- **Acceptance Criteria**: Changing college tenant header updates primary theme color instantly.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] FOUC test passes.

### MS-43: Web App Shell, Router & Authentication Layout

- **Objective**: Construct Next.js 15 App Router shell, top navigation bar, sidebar, and auth route guards.
- **Scope**: `apps/web/src/app/*`.
- **Deliverables**: Root layout, landing page, sign-in & registration pages.
- **Dependencies**: MS-19, MS-42.
- **Acceptance Criteria**: Authenticated student accesses dashboard; unauthenticated user redirected to `/login`.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Auth middleware guard tested.

### MS-44: Web Views: Rate My Professor Directory & Review Form

- **Objective**: Build Web UI pages for searching professors, viewing ratings, and submitting reviews.
- **Scope**: `apps/web/src/app/(dashboard)/professors/*`.
- **Deliverables**: Responsive professor search page and review modal form.
- **Dependencies**: MS-28, MS-43.
- **Acceptance Criteria**: Student searches professor, views rating breakdown, and submits review via web UI.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Page LCP < 2.5s.

### MS-45: Web Views: Study Materials Catalog & S3 Upload Modal

- **Objective**: Build Web UI pages for searching study materials and uploading exam papers with upload progress bar.
- **Scope**: `apps/web/src/app/(dashboard)/materials/*`.
- **Deliverables**: Material search grid, course filter sidebar, pre-signed upload modal.
- **Dependencies**: MS-30, MS-43.
- **Acceptance Criteria**: Student selects PDF file, watches progress bar upload directly to S3/MinIO, and sees new item in catalog.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Direct S3 upload from browser verified.

### MS-46: Web Views: Student Marketplace & Item Detail View

- **Objective**: Build Web UI pages for browsing marketplace items, creating listings, and buyer-seller chat modal.
- **Scope**: `apps/web/src/app/(dashboard)/marketplace/*`.
- **Deliverables**: Marketplace product grid, listing creation form, status toggle buttons.
- **Dependencies**: MS-32, MS-43.
- **Acceptance Criteria**: Marketplace feed displays items with price badges and images; responsive on mobile browsers.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Product grid layout responsive.

### MS-47: Web Views: Anonymous Confessions Feed & Moderation Banner

- **Objective**: Build Web UI feed for reading confessions with infinite scroll, upvote buttons, and submission modal.
- **Scope**: `apps/web/src/app/(dashboard)/confessions/*`.
- **Deliverables**: Confession feed page, infinite scroll query hook, submission modal with AI moderation notice.
- **Dependencies**: MS-34, MS-43.
- **Acceptance Criteria**: User scrolls feed seamlessly; upvotes increment count dynamically without page reload.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Cumulative Layout Shift (CLS) < 0.1.

---

## Phase 9: Mobile Application (React Native Expo)

### MS-48: Mobile Clean Architecture Shell & Secure Keychain Setup

- **Objective**: Construct React Native Expo project (`apps/mobile`) with Clean Architecture layers and secure keychain store.
- **Scope**: `apps/mobile/src/*`.
- **Deliverables**: Expo navigation stack, `expo-secure-store` auth token persistence wrapper.
- **Dependencies**: MS-19, MS-41.
- **Acceptance Criteria**: App boots on iOS/Android, renders login screen, and persists auth token safely in native keychain.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] App runs cleanly on iOS Simulator & Android Emulator.

### MS-49: Mobile Offline-First MMKV Storage Sync Engine

- **Objective**: Implement offline caching engine using MMKV for offline feed reading and queued offline actions.
- **Scope**: `apps/mobile/src/data/cache/*`.
- **Deliverables**: MMKV storage adapter, offline network listener.
- **Dependencies**: MS-48.
- **Acceptance Criteria**: App displays cached confessions feed when internet is disconnected.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Offline feed viewing verified.

### MS-50: Mobile Views: Rate My Professor & Study Materials Screens

- **Objective**: Build native screens for professor directory search and study material browsing.
- **Scope**: `apps/mobile/src/presentation/screens/professors/*`, `.../materials/*`.
- **Deliverables**: `FlashList` professor directory screen, PDF material viewer screen.
- **Dependencies**: MS-28, MS-30, MS-49.
- **Acceptance Criteria**: Native lists scroll smoothly at 60 FPS using `FlashList`.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] FPS scroll performance verified.

### MS-51: Mobile Views: Confessions Feed & Student Marketplace Screens

- **Objective**: Build native screens for confessions feed and marketplace listings.
- **Scope**: `apps/mobile/src/presentation/screens/confessions/*`, `.../marketplace/*`.
- **Deliverables**: Confessions feed screen, marketplace grid screen, image picker integration.
- **Dependencies**: MS-32, MS-34, MS-49.
- **Acceptance Criteria**: Student picks photo from camera roll and posts marketplace listing from mobile app.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [ ] Mobile image picker upload verified.

### MS-52: Mobile Push Notification Registration & Deep Linking Setup

- **Objective**: Integrate Expo Push Token registration and deep link routing.
- **Scope**: `apps/mobile/src/navigation/deep-linking.ts`.
- **Deliverables**: Deep link handler routing notifications to specific mobile screens.
- **Dependencies**: MS-40, MS-48.
- **Acceptance Criteria**: Tapping push notification opens relevant deep link screen on mobile device.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Deep link route tested.

---

## Phase 10: Production Operations, Security & Hardening

### MS-53: CI/CD Pipeline Automation & Security Vulnerability Scanning

- **Objective**: Configure GitHub Actions workflows for automated linting, testing, type-checking, and Trivy security scanning.
- **Scope**: `.github/workflows/ci.yml`.
- **Deliverables**: GitHub Actions CI pipeline executing on all PRs.
- **Dependencies**: MS-01, MS-13.
- **Acceptance Criteria**: PR cannot be merged unless linting, unit tests, integration tests, and security scans pass.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] CI pipeline executes under 5 minutes.

### MS-54: Staging & Production Multi-Stage Container Deployment

- **Objective**: Build optimized multi-stage Alpine Dockerfiles for backend API and web frontend applications.
- **Scope**: `apps/api/Dockerfile`, `apps/web/Dockerfile`.
- **Deliverables**: Production-ready Docker container images (< 150MB).
- **Dependencies**: MS-53.
- **Acceptance Criteria**: Containers boot cleanly in production mode; handle `SIGTERM` signals gracefully.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [ ] Graceful shutdown verified.

### MS-55: OpenTelemetry Distributed Tracing & Prometheus Metrics Integration

- **Objective**: Integrate OpenTelemetry tracing headers and Prometheus `/metrics` exporter endpoint.
- **Scope**: `apps/api/src/plugins/telemetry.ts`, `apps/worker/src/plugins/telemetry.ts`, `packages/observability`, `packages/logger`, `packages/security`.
- **Deliverables**: Prometheus metrics exporter, OpenTelemetry tracer plugin (OTLP), structured log/metric/trace correlation, health probes, 7 Grafana dashboards, alert rules + SLOs (Helm-deployed), local docker-compose observability profile.
- **Dependencies**: MS-04, MS-54.
- **Acceptance Criteria**: `/metrics` exposes request counters, P95/P99 latency histograms, and DB pool metrics; dashboards, rules, and SLOs render via Helm (verified with kubeconform).
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [x] `pnpm lint` 9/9 green, [x] `pnpm verify` 21/21 green, [x] `helm lint`/`template` + kubeconform 0 errors, [x] `docker compose config` OK, [ ] Prometheus scraper reads metrics (requires live cluster).

### MS-56: Error Tracking & Incident Response Platform

- **Objective**: Build a production-grade, provider-neutral error tracking and incident response platform with zero commercial SaaS dependency.
- **Scope**: `modules/error-tracking` (domain/application/infrastructure/presentation/core), API plugin wiring, worker wiring, web console (`/admin/error-tracking`), Helm `errorTracking` values, docs + 7 runbooks.
- **Deliverables**: Capture of unhandled exceptions/rejections, Fastify 5xx, validation, DB/Redis/worker/queue/startup/shutdown/health failures; 8-class automatic classification; INFO..CRITICAL severity with frequency escalation; sha1 fingerprint aggregation; 5-state incident lifecycle; 6 automatic incident rules; pluggable transports (console, structured logger, OTel events; Sentry/self-hosted via the same `IErrorTransport` contract); 6 REST endpoints; operational console.
- **Dependencies**: MS-55.
- **Acceptance Criteria**: Tracker captures and aggregates errors; incident engine opens automatic incidents; REST + console expose errors/incidents/statistics; Helm gates `ERROR_TRACKING_ENABLED` per environment; runbooks documented; zero regressions.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [x] `pnpm lint` green, [x] `pnpm type-check` green, [x] `pnpm test` green (module 24/24, web 64/64), [x] `pnpm verify` green, [x] `helm lint` 0 errors, [x] manifests rendered + kubeconform 0 errors, [ ] live-cluster capture/incident verification (requires live cluster).

### MS-57: Backup, Point-in-Time Recovery (PITR) & Disaster Recovery Drill

- **Objective**: Configure automated WAL archiving to S3, daily snapshots, and perform simulated DR drill.
- **Scope**: `packages/backup` (object store client, PostgreSQL/Redis/MinIO services, retention, orchestrator, CLI), `scripts/dr-restore-test.sh`, `Dockerfile.backup`, Helm `backup` values + CronJobs + WAL archiver sidecar + restore Job + alert rules + Grafana dashboard, workflows (`deploy-validation`, `release`), docs + runbooks.
- **Deliverables**: S3-compatible object store client (SigV4, zero commercial SaaS); PostgreSQL logical (`pg_dump`) + physical (`pg_basebackup`) snapshots with SHA-256 verification and restore-to-new-cluster; continuous WAL archiving (`archive_command`) + PITR restore (`recovery.signal` + `restore_command`); Redis RDB snapshots + restore; MinIO bucket mirror + integrity verification; retention enforcement (7 full / 72h WAL / 3 RDB / 7 mirrors); `backup` CLI (run-all, create-_, verify, restore-_, archive/fetch-wal, wal-forward, list, cleanup); automated DR drill (RTO < 15 min, checksum-matched restore); Helm: nightly CronJobs, WAL archiver sidecar, on-demand restore Job, network policies, Prometheus rules (backup failed/stale/archiver down), backup Grafana dashboard, Velero opt-in; 20 package tests; 7 runbooks.
- **Dependencies**: MS-06, MS-54.
- **Acceptance Criteria**: Database successfully restored from automated backup snapshot within 10 minutes (RTO < 15m verified); automated drill verifies checksums match the primary.
- **Estimated Effort**: 2 Days.
- **Verification Checklist**: [x] `pnpm lint` green, [x] `pnpm type-check` green, [x] `pnpm test` green (backup 20/20), [x] `pnpm verify` green, [x] `helm lint` 0 errors, [x] manifests rendered + validated (dev/staging/prod), [ ] DR drill executed on a live docker host (requires local compose infrastructure).

### MS-58: Final Platform Security Audit & Production Release Sign-Off

- **Objective**: Execute comprehensive end-to-end security audit, penetration testing checklist, and production deployment sign-off.
- **Scope**: Full monorepo codebase & infrastructure.
- **Deliverables**: Final Security Audit Report, v1.0.0 Production Release Tag, Load Test Benchmark Report, Security Audit Test Suite, `docs/ms-58-security-audit-and-production-release.md`.
- **Dependencies**: MS-01 through MS-57.
- **Acceptance Criteria**: Zero high/critical vulnerability findings; all 58 milestone DoD criteria satisfied.
- **Estimated Effort**: 3 Days.
- **Verification Checklist**: [x] `pnpm lint` green, [x] `pnpm type-check` green, [x] `pnpm test` green (all packages passed), [x] `pnpm verify` green, [x] `pnpm security:audit` green (0 high/critical CVEs), [x] `pnpm load:test` green (p95 < 50ms), [x] manifests rendered & validated (dev/staging/prod), [x] Final production sign-off complete.

---

_End of Master Phased Implementation Roadmap (58 Milestones - FROZEN)._
