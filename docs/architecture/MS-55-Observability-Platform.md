# Observability Platform Documentation (MS-55)

## 1. Overview

MS-55 makes College Hub production-observable end to end. It delivers the four
pillars of modern observability — **metrics, tracing, structured logging, and
health probes** — backed by a provider-neutral Prometheus + OpenTelemetry +
Grafana stack that deploys through the existing Helm chart.

Design goals:

- **Business logic untouched.** All telemetry is instrumentation added at the
  boundaries (HTTP, DB, cache, jobs, domain use-cases) — no behavioural change.
- **Prometheus-native metrics** exposed on every workload's `/metrics`
  endpoint, scraped via `ServiceMonitor`/`PodMonitor`.
- **Opt-in distributed tracing** (W3C `traceparent`) bridged into logs so a
  trace, its spans, and its structured log lines carry the same `traceId`.
- **SLO-driven alerting** using Google SRE multi-window burn rates, not
  static thresholds.
- **Self-contained local stack** via `docker compose --profile observability`.

---

## 2. Core Principles

| Principle                     | Implementation                                                                              |
| :---------------------------- | :------------------------------------------------------------------------------------------ |
| Instrumentation only          | No domain/use-case behaviour changes; all edits are observability boundary code             |
| Defaults on, tracing opt-in   | Metrics/logging/health always on; traces require `OTEL_TRACES_ENABLED=true`                 |
| No-op safety                  | Every helper degrades to a lightweight no-op when disabled, so call sites are unconditional |
| Process-wide default instance | `observability.configure(...)` applies `service`/`environment` labels to every sample       |
| Correlation first             | `traceId`/`spanId` flow from spans into pino logs via `AsyncLocalStorage`                   |
| Provider-neutral infra        | Rules/dashboards are rendered by the existing provider-neutral Helm chart                   |

---

## 3. Repository Layout

```
packages/observability/            # NEW shared observability core (no framework deps)
  src/registry.ts                  # lazy metric registry + Prometheus default labels + exposition
  src/metrics.ts                   # process-wide default instance + facades wiring
  src/http-metrics.ts              # HTTP request counters/histograms/gauge
  src/db-metrics.ts                # query duration/errors, slow queries, pool gauge
  src/cache-metrics.ts             # Redis command rate/latency/errors, connectivity
  src/job-metrics.ts               # job result counter, duration, in-flight gauge
  src/business-metrics.ts          # domain counters (auth, marketplace, notifications, placement)
  src/tracing.ts                   # OTel SDK bootstrap, span helpers, log-context bridge
  src/instrumentation.ts           # query/redis/pool/job instrumenters + withJobMetrics
  src/index.ts
  test/                            # 25 unit tests (registry, facades, tracing, instrumentation)

packages/logger/
  src/context-store.ts             # AsyncLocalStorage TraceContextStore + log mixin
  src/index.ts                     # 6 tests incl. log/span correlation

packages/config/src/env.schema.ts  # SERVICE_NAME, METRICS_ENABLED, OTEL_TRACES_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT

apps/api/
  src/plugins/observability.plugin.ts  # HTTP metrics + per-request spans + /metrics route
  src/health.ts                        # /health/live, /health/ready, /health/startup probes
  test/observability.test.ts           # 4 tests
apps/worker/
  src/runtime.ts, src/http.ts, src/index.ts   # pool/redis instrumentation, /metrics, tracing shutdown

Instrumented modules (business counters only):
  packages/security/src/identity-kernel.service.ts          # auth
  modules/notifications/src/infrastructure/publishers/generic-event-publisher.ts
  modules/marketplace/src/use-cases/marketplace.use-cases.ts + workers/event-router.ts
  modules/placement-guidance/src/application/use-cases.ts

infra/observability/
  compose/                         # local stack configs (prometheus, grafana, otel-collector)
  README.md                        # provisioning guide
infra/helm/collegehub/
  rules/                           # 6 alert rule files + 3 SLO files (PrometheusRule CRDs)
  dashboards/                      # 7 Grafana dashboards (JSON, schemaVersion 39)
  templates/observability/         # ServiceMonitor, PodMonitor, PrometheusRules, dashboard ConfigMaps
docker-compose.yml                 # `--profile observability` Prometheus/Grafana/OTel collector
```

---

## 4. Metrics Inventory

Every metric is prefixed `collegehub_` and carries Prometheus default labels
`service` (per-process `SERVICE_NAME`) and `environment` (`NODE_ENV`).

### HTTP (`apps/api` /metrics, from the observability plugin)

| Metric                                     | Type      | Labels                | Notes                                        |
| :----------------------------------------- | :-------- | :-------------------- | :------------------------------------------- |
| `collegehub_http_requests_total`           | counter   | method, route, status | every response                               |
| `collegehub_http_request_duration_seconds` | histogram | method, route         | buckets 5ms–10s                              |
| `collegehub_http_requests_in_flight`       | gauge     | method, route         | incremented onRequest/decremented onResponse |
| `collegehub_http_response_size_bytes`      | histogram | method, route         | payload byte count                           |

### Database (PostgreSQL) — instrumented query client

| Metric                                      | Type      | Labels                     |
| :------------------------------------------ | :-------- | :------------------------- |
| `collegehub_db_query_duration_seconds`      | histogram | result (success/error)     |
| `collegehub_db_query_errors_total`          | counter   | —                          |
| `collegehub_db_slow_queries_total`          | counter   | query_hash, query_prefix   |
| `collegehub_db_slow_query_duration_seconds` | histogram | —                          |
| `collegehub_db_pool`                        | gauge     | state (total/idle/waiting) |

### Cache (Redis) — instrumented client

| Metric                                      | Type      | Labels  |
| :------------------------------------------ | :-------- | :------ |
| `collegehub_redis_commands_total`           | counter   | command |
| `collegehub_redis_command_duration_seconds` | histogram | —       |
| `collegehub_redis_errors_total`             | counter   | —       |
| `collegehub_cache_connected`                | gauge     | —       |

### Background jobs (worker runtime + event router)

| Metric                            | Type      | Labels                        |
| :-------------------------------- | :-------- | :---------------------------- |
| `collegehub_jobs_total`           | counter   | job, result (success/failure) |
| `collegehub_job_duration_seconds` | histogram | job                           |
| `collegehub_jobs_in_flight`       | gauge     | job                           |

### Business KPIs

| Metric                                   | Type    | Labels | Incremented by                        |
| :--------------------------------------- | :------ | :----- | :------------------------------------ |
| `collegehub_auth_logins_total`           | counter | result | identity-kernel login success/failure |
| `collegehub_auth_registrations_total`    | counter | result | registration success/failure          |
| `collegehub_marketplace_listings_total`  | counter | action | created/published/sold                |
| `collegehub_marketplace_offers_total`    | counter | action | created/accepted                      |
| `collegehub_notifications_total`         | counter | action | published/dropped/failed              |
| `collegehub_placement_queries_total`     | counter | kind   | company/experience/question           |
| `collegehub_interview_submissions_total` | counter | result | interview submissions                 |

### Process (prom-client `collectDefaultMetrics`)

`nodejs_*` heap/GC/event-loop, `process_*` cpu/rss/fds, plus libuv hand-rolled
active handles/requests gauges via `instrumentQueryClient`-adjacent hooks.

---

## 5. Tracing

`packages/observability/src/tracing.ts` bootstraps an **OpenTelemetry NodeSDK**
(OTLP/HTTP exporter) when `OTEL_TRACES_ENABLED=true`.

- **Service attributes:** `service.name` from `SERVICE_NAME`,
  `deployment.environment`, optional `service.version`.
- **Export endpoint:** `OTEL_EXPORTER_OTLP_ENDPOINT`
  (default `http://localhost:4318/v1/traces`).
- **W3C propagation:** `extractTraceContext(headers)` extracts a parent
  `traceparent`; the API plugin wraps every request in
  `HTTP <METHOD> <route>` (attributes: http.request.method, http.route,
  http.response.status_code, response size) and marks spans error on 5xx.
- **Log bridge:** span start/end push `traceId`/`spanId` into
  `TraceContextStore`; the pino mixin copies them onto every structured log
  line, so logs, spans, and traces cross-link in Grafana.
- **Shutdown:** `shutdownTracing()` flushes on graceful close.

---

## 6. Structured Logging Correlation

`packages/logger` gained `TraceContextStore` (AsyncLocalStorage) and a pino
`mixin`:

- `setSpanId`, `setRequestId`, `setServiceName` mutate the active context.
- Every log line carries `requestId` and, inside a span, `traceId`/`spanId`.
- Degrades cleanly when no context is active (no key emitted).

---

## 7. Health Probes

`apps/api/src/health.ts` (also mirrored by the worker health server):

| Endpoint          | Semantics                                            |
| :---------------- | :--------------------------------------------------- |
| `/health/live`    | 200 OK — process alive (liveness)                    |
| `/health/ready`   | 200 OK / 503 DEGRADED — dependency checks (Postgres) |
| `/health/startup` | 200 OK / 503 STARTING — migration/startup gate       |

The Helm chart wires these into `livenessProbe`/`readinessProbe` on the API and
worker deployments.

---

## 8. Dashboards (7)

Rendered by the chart as `ConfigMap`s labelled `grafana_dashboard: "1"`
(consumed by the kube-prometheus-stack sidecar) and provisioned locally via
`infra/observability/compose`. All target datasource UID `prometheus`.

| UID                     | Title             | Panels                                                 |
| :---------------------- | :---------------- | :----------------------------------------------------- |
| `collegehub-api-http`   | API (HTTP)        | rate by route, p50/p99, status, in-flight, payload p95 |
| `collegehub-database`   | Database          | query p50/p99, throughput & errors, slow top10, pool   |
| `collegehub-cache`      | Cache (Redis)     | command rate, latency, errors, connectivity            |
| `collegehub-jobs`       | Background Jobs   | success/failure rate, p99 duration, in-flight          |
| `collegehub-business`   | Business KPIs     | auth, marketplace, notifications, placement            |
| `collegehub-process`    | Process (Node.js) | CPU, memory, event-loop lag, handles/fds               |
| `collegehub-kubernetes` | Kubernetes        | pod CPU/mem vs requests, restarts, pods/node           |

---

## 9. Alerting Rules and SLOs

`infra/helm/collegehub/rules/` holds 6 alert-rule files and 3 SLO files, each a
`PrometheusRule` CRD rendered by the chart.

**Alert groups:** API down/5xx/latency/in-flight/payload, DB error rate/
latency/slow-query/pool, cache down/Redis errors, worker failure/duration/stuck
jobs, auth-failure spikes, notification failures, event-loop lag, heap usage,
crash loops.

**SLOs (Google SRE multi-window burn rate):**

| SLO              | Objective | Budget | Page alerts                                         |
| :--------------- | :-------- | :----- | :-------------------------------------------------- |
| HTTP 5xx         | 99.5%     | 0.5%   | burn ≥ 14.4 over 5m, ≥ 6 over 30m; warn ≥ 1 over 1h |
| Background jobs  | 99%       | 1%     | same windows                                        |
| DB query success | 99%       | 1%     | same windows                                        |

Recording rules:
`collegehub:slo:<target>:errors_ratio:rate5m|30m|1h`,
`...:error_budget_remaining`, `...:burn_rate:5m|30m|1h`.

---

## 10. Helm Chart Integration

`infra/helm/collegehub` `observability` values section:

```yaml
observability:
  enabled: true
  metricsEnabled: true # METRICS_ENABLED in the shared ConfigMap
  tracesEnabled: true # OTEL_TRACES_ENABLED (false in dev, true in staging/prod)
  otlpEndpoint: http://collegehub-otlp-collector:4317
  serviceNameApi: college-hub
  serviceNameWorker: college-hub-worker
  serviceMonitor: { enabled: true, labels: { release: prometheus } }
  podMonitor: { enabled: true, labels: { release: prometheus } }
  prometheusRules: { enabled: true }
  grafanaDashboards: { enabled: true }
```

- `ServiceMonitor` scrapes the API `Service` `/metrics`; `PodMonitor` scrapes
  worker pods (the worker has no `Service`).
- The 9 `rules/*.yaml` are templated into `PrometheusRule` resources and the 7
  `dashboards/*.json` into dashboard ConfigMaps (both via `.Files.Glob`).
- The worker/API deployments set `SERVICE_NAME` per component so metric labels
  stay attributable.
- Dev overlay disables the operator resources (no monitoring stack in the dev
  namespace); staging/prod keep them enabled.

---

## 11. Local Development

```sh
docker compose --profile observability up -d
```

- Prometheus `http://localhost:9090` scrapes host `:4000` and `:4100` `/metrics`
  via `host.docker.internal`.
- Grafana `http://localhost:3001` (admin/admin) auto-provisions the Prometheus
  datasource (UID `prometheus`) and all 7 dashboards.
- OTel collector receives traces at `http://localhost:4318/v1/traces`; set
  `OTEL_TRACES_ENABLED=true` in your local `.env`.

---

## 12. CI/CD Validation

`.github/workflows/deploy-validation.yml` already runs `helm lint` + `helm
template` for dev/staging/prod + `kubeconform`. MS-55 additions:

- New chart templates (`ServiceMonitor`, `PodMonitor`, `PrometheusRule`,
  dashboard ConfigMaps) render for staging/prod and are validated by
  kubeconform with `-ignore-missing-schemas` (Prometheus Operator CRDs have no
  built-in schemas).
- Dev render fixed a latent duplicate-key ConfigMap bug
  (`STORAGE_PROVIDER`) surfaced by kubeconform when dev enables MinIO.

---

## 13. Verification

- `pnpm type-check` — green across all workspaces.
- `pnpm test` — observability 25, logger 6, security 18, notifications 4,
  marketplace 30, placement-guidance 9, API observability 4 + health tests.
- `pnpm verify` — full build + test pipeline.
- `helm lint infra/helm/collegehub` — 0 failures.
- `helm template` dev/staging/prod + `kubeconform -strict -ignore-missing-schemas`
  — dev 17 valid / staging 42 / prod 42 (CRD resources skipped, 0 errors).
- `docker compose config` — observability profile validates.

---

## 14. Known Follow-Ups

- `request.routerPath` emits Fastify `FSTDEP017` (deprecation) — migrate to
  `request.routeOptions.url`.
- Tracing uses the OTLP/HTTP exporter only; no in-cluster collector is deployed
  by this chart (point `otlpEndpoint` at your receiver).
- Rules/SLOs run as PrometheusRules; plain `prom/prometheus` (compose) does not
  evaluate them — alerting is a cluster-time concern.
- Repo-wide lint scripts are absent (`pnpm lint` structurally fails) — deferred
  to the lint-gap follow-up.
