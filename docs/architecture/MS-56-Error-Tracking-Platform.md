# MS-56 — Error Tracking & Incident Response Platform

Production error tracking **without any commercial SaaS**. A reusable platform
module (`modules/error-tracking`, package `@college-hub/mod-error-tracking`)
captures errors from every runtime source, classifies and aggregates them,
drives an automatic incident engine, and reports through **pluggable provider
transports** (console for development, structured logger, OpenTelemetry events;
Sentry and self-hosted collectors can be added later through the same
`IErrorTransport` contract).

## Design Goals

- No commercial SaaS dependency. The provider layer is an abstraction, not an integration.
- Reuse the existing platform: `@college-hub/logger`, `@college-hub/observability`
  (Prometheus registry + OpenTelemetry), `@college-hub/core` module kernel,
  `@college-hub/config` env schema.
- No duplicated middleware. The API gateway pipeline plugin hooks the tracker;
  no new Fastify middleware is introduced.
- Failures must be detectable, diagnosable, traceable and recoverable:
  every captured error carries trace context (requestId/traceId/spanId) that
  correlates with the existing OTLP tracing and structured logs.
- DDD module layout: `domain/` (entities + repository/transport contracts),
  `application/` (pure engines), `infrastructure/` (repositories, transports),
  `presentation/` (Fastify routes + validators + controller), `core/`
  (tracker composition root + process handlers).

## Module Layout

```
modules/error-tracking/src/
├── index.ts                       # Module class + public exports
├── domain/
│   ├── entities.ts                # TrackedErrorEntity, IncidentEntity, enums
│   ├── repository.interface.ts    # IErrorTrackingRepository + queries
│   └── transport.interface.ts     # IErrorTransport (provider abstraction)
├── application/
│   ├── error-classifier.ts        # 8 automatic classes
│   ├── severity-engine.ts         # INFO..CRITICAL + escalation
│   ├── fingerprint.ts             # sha1 deduplication fingerprint
│   ├── error-introspection.ts     # message/stack/cause/code extraction
│   ├── incident-rules.ts          # 6 configurable automatic rules
│   ├── incident-engine.ts         # pure rule evaluation -> incidents
│   └── runbook-catalog.ts         # 7 runbooks referenced by incidents
├── infrastructure/
│   ├── transports/console-transport.ts            # Console provider
│   ├── transports/structured-logger-transport.ts  # Structured logger provider
│   ├── transports/otel-transport.ts               # OpenTelemetry events provider
│   └── repositories/in-memory-error-tracking.repository.ts
├── presentation/
│   ├── routes.ts                  # 6 REST endpoints (no new middleware)
│   ├── controller.ts              # envelope {success, data, metadata}
│   └── validators.ts              # Zod request schemas
└── core/
    ├── error-tracker.ts           # composition root (capture pipeline)
    ├── global-handlers.ts         # uncaughtException / unhandledRejection
    └── tracker-instance.ts        # process-wide bootstrap + transports CSV
```

## Capture Sources

| Source              | Where it is wired                                                       |
| ------------------- | ----------------------------------------------------------------------- |
| Uncaught exceptions | `installProcessErrorHandlers` — worker & API processes                  |
| Promise rejections  | `installProcessErrorHandlers` — worker & API processes                  |
| Fastify 5xx errors  | `apps/api/src/plugins/pipeline.plugin.ts` (`captureRequestError`)       |
| Validation failures | `ZodError` in the API pipeline (5xx only; 4xx are client errors)        |
| Repository failures | `recordDependencyFailure('database', ...)`                              |
| Database            | Redis/pg health checks, pool failures (worker `runtime.ts`, API health) |
| Redis               | `recordDependencyFailure('redis', ...)`                                 |
| Worker failures     | `apps/worker/src/runtime.ts` try/catch + rethrow                        |
| BullMQ job failures | job handler failures captured with `source: 'queue'`                    |
| Startup failures    | captured via `source: 'startup'` (CRITICAL by default)                  |
| Shutdown failures   | captured via `source: 'shutdown'`                                       |
| Health check fails  | `recordDependencyFailure('health', ...)`                                |

## Error Context

Every captured error carries the following fields (see `TrackedErrorEntity`):

`timestamp` (firstSeenAt/lastSeenAt), `serviceName`, `moduleId`, `requestId`,
`traceId`, `spanId`, `tenantId`, `userId`, `route`/`method`, `statusCode`,
`errorClass`, `severity`, `source`, `name`, `message`, `code`, `stackTrace`,
`causeChain`, `attributes`, `occurrenceCount`, `affectedServices`.
Deployment version/environment/hostname are added by the transports from the
runtime environment (`@college-hub/logger` + OTel resource attributes).

## Classification

`ErrorClassifier` maps an error to one of eight classes automatically:

**Validation, Infrastructure, Database, Network, Authentication, Authorization,
BusinessLogic, Unknown**

Rules are keyword/code-driven (e.g. ECONNREFUSED/ETIMEDOUT → Network, Zod →
Validation, `password`/`credential` → Authentication, `permission`/`forbidden`
→ Authorization, sql/query/relation/constraint → Database, OOM → Infrastructure).

## Severity

`SeverityEngine` computes INFO..CRITICAL from class + source + message, then
escalates on frequency: **5 occurrences → +1 level, 10 occurrences → +2 levels**
(capped at CRITICAL). OOM/startup → CRITICAL; connection-refused database →
CRITICAL. Rules are plain constants and are configurable via the module options
(`incident-rules.ts`, `severity-engine.ts`).

## Aggregation

Identical errors are deduplicated by `sha1(class|source|name|normalizedMessage)`
fingerprint. Within `dedupeWindowMs` (default 24h) repeat captures increment the
same aggregate: `firstSeenAt`, `lastSeenAt`, `occurrenceCount`,
`affectedServices`, `recentOccurrences`. A RESOLVED/CLOSED aggregate reopens on
a new occurrence.

## Prometheus Metrics

Reuses the shared `@college-hub/observability` registry (no new exporter):

- `collegehub_error_tracking_errors_total{class,severity,source}`
- `collegehub_error_tracking_incidents_total{severity}`

These are scraped by the existing MS-55 Prometheus/ServiceMonitor setup and are
used by the incident-rule triggers in runbooks.

## Provider Abstraction (Pluggable Transports)

```ts
export interface IErrorTransport {
  readonly name: string;
  report(error: TrackedErrorEntity): void;
}
```

Implemented providers:

| Provider             | Name         | Environment default         |
| -------------------- | ------------ | --------------------------- |
| Console              | `console`    | development                 |
| Structured logger    | `structured` | development + non-dev       |
| OpenTelemetry events | `otel`       | non-development             |
| Sentry (future)      | `sentry`     | pluggable via same contract |
| Self-hosted (future) | `selfHosted` | pluggable via same contract |

Selection: `createDefaultTransports()` reads `ERROR_TRACKING_TRANSPORTS`
(comma separated); Helm exposes `errorTracking.transports` in `values.yaml`.

## REST API

Six endpoints registered by the `ErrorTrackingModule` on the API monolith
(gated by `ERROR_TRACKING_ENABLED === 'true'`):

```
GET    /errors                     # paginated, filterable
GET    /errors/statistics          # aggregate counters
GET    /errors/:id                 # single aggregated error
GET    /incidents                  # paginated, filterable
GET    /incidents/:id              # single incident
PATCH  /incidents/:id/status       # lifecycle transition {status, actor, note?}
```

Envelope: `{ success: true, data, metadata: { timestamp } }`; errors:
`{ success: false, error: { code, message, details? } }`. See
`docs/api/MS-56-ERROR_TRACKING_API.md`.

## Runtime Wiring

- **API** (`apps/api/src/server.ts`): when `ERROR_TRACKING_ENABLED=true`,
  bootstraps the tracker (in-memory repository + `createDefaultTransports()`),
  registers `ErrorTrackingModule` (routes + `error.tracked` event bus
  subscription), clears the instance on close.
- **Worker** (`apps/worker/src/index.ts`): bootstraps the tracker,
  `installProcessErrorHandlers`, disposes on shutdown; task failures captured in
  `runtime.ts`, dependency failures in Redis/pg health paths.
- **Web console**: `apps/web/src/lib/api-error-tracking.ts` typed client +
  pages under `/admin/error-tracking`.

## Deployment Configuration (Helm)

`infra/helm/collegehub/values.yaml` → `errorTracking:` section:

```yaml
errorTracking:
  enabled: true # false in dev overlay
  dedupeWindowMs: '86400000'
  transports: 'structured,otel'
  sentry: { enabled: false, dsn: '' } # future provider extension point
  selfHosted: { enabled: false, endpoint: '' }
```

Rendered into the shared ConfigMap as `ERROR_TRACKING_ENABLED`,
`ERROR_TRACKING_DEDUPE_WINDOW_MS`, `ERROR_TRACKING_TRANSPORTS`. Dev overlay
disables it; staging/production enable it.

## Related Documents

- `docs/architecture/MS-56-Error-Flow.md` — end-to-end capture pipeline
- `docs/architecture/MS-56-Incident-Lifecycle.md` — lifecycle + recovery
- `docs/api/MS-56-ERROR_TRACKING_API.md` — REST reference
- `docs/MS-56-Developer-Integration-Guide.md` — how to integrate the tracker
- `docs/runbooks/*.md` — 7 operator runbooks
