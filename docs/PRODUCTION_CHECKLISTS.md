# College Hub — Production Deployment & Operational Validation Checklists

**Platform**: College Hub Enterprise SaaS Monolith  
**Version**: `v1.0.0-beta`  
**Date**: August 4, 2026  
**Status**: VERIFIED FOR INTERNAL ALPHA DEPLOYMENT

---

## 1. Production Integration Audit Matrix (Phase 2)

| Integration / Service Component   | Type                  | Integration Status | Implementation & Configuration Details                                                                                                    |
| :-------------------------------- | :-------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL Database**           | Core Relational Store | ✅ **Complete**    | Drizzle ORM schema, RLS policies (`SET LOCAL app.current_college_id`), connection pool monitoring, migration scripts.                     |
| **Redis Cache & BullMQ Queue**    | Memory & Async Queue  | ✅ **Complete**    | Token bucket rate limiting, invalidation pub/sub, BullMQ event queues for async background workers.                                       |
| **MinIO / S3 Object Storage**     | Media Storage         | ✅ **Complete**    | Zero-dependency SigV4 S3 client, file upload validation, bucket mirroring, SHA-256 backup archive store.                                  |
| **SMTP / Email Delivery**         | Messaging             | ✅ **Complete**    | Configured via `@college-hub/config` (`SMTP_HOST`, `SMTP_PORT`), `.edu` OTP email dispatch engine.                                        |
| **Password Reset & Verification** | Identity Workflow     | ✅ **Complete**    | Mandatory single-use 6-digit OTP verification with 10-minute expiry and Argon2id password history checks.                                 |
| **OAuth / Identity Kernel**       | Authentication        | ✅ **Complete**    | Custom verified identity kernel with `.edu` domain validation and JWT RS256/HS256 signature verification.                                 |
| **Prometheus Exporter**           | Telemetry / Metrics   | ✅ **Complete**    | `/metrics` endpoint active via `@college-hub/observability` emitting process, HTTP, DB pool, and custom business metrics.                 |
| **OpenTelemetry Tracing**         | Distributed Tracing   | ✅ **Complete**    | W3C trace context propagation, Fastify request tracing, Drizzle query instrumentation.                                                    |
| **Grafana Dashboards**            | Observability UI      | ✅ **Complete**    | Helm dashboard JSON definitions committed under `infra/helm/collegehub/dashboards/`.                                                      |
| **Alertmanager & Rules**          | Alerting System       | ✅ **Complete**    | Prometheus alert rules (`high-latency`, `api-down`, `backup-failed`, `db-pool-exhausted`) committed under `infra/helm/collegehub/rules/`. |
| **Backup Destination & PITR**     | Disaster Recovery     | ✅ **Complete**    | Automated physical/logical PostgreSQL snapshots, S3 SigV4 upload, WAL continuous archiving, PITR recovery.                                |
| **DNS & Ingress Controller**      | Traffic Routing       | ✅ **Complete**    | NGINX Ingress definitions with host routing, path prefixing (`/api`, `/metrics`, `/health`).                                              |
| **HTTPS & TLS Certificates**      | Ingress Security      | ✅ **Complete**    | cert-manager integration via Helm `ingress.tls` annotations for automated Let's Encrypt / Vault issuing.                                  |
| **Domain Resolution**             | Multi-Tenancy         | ✅ **Complete**    | Subdomain & header-based tenant resolution (`x-college-id`, `x-college-slug`) via Fastify `tenantContextPlugin`.                          |

---

## 2. Production Deployment Validation (Phase 3)

- **Docker Images**: Built via multi-stage builds (`AS builder`, `AS runner`), operating under non-root service accounts (`UID 1001`), with active `HEALTHCHECK` directives across all 4 container images (`Dockerfile.api`, `Dockerfile.web`, `Dockerfile.worker`, `Dockerfile.backup`).
- **Helm Charts & Manifests**: Helm v3 chart (`infra/helm/collegehub`) renders cleanly into `infra/k8s/render/{dev,staging,prod}/all.yaml`. Validated for 10 resource kinds in dev and 15 resource kinds in staging/prod.
- **Pod Security Standards**: Enforces `runAsNonRoot: true`, `drop: ["ALL"]` Linux capabilities, `readOnlyRootFilesystem: true`, and explicit CPU/Memory request and limit bounds.
- **Autoscaling & Resilience**: HorizontalPodAutoscaler (HPA) configured for API (min 2, max 10, target 70% CPU), PodDisruptionBudget (PDB) configured for `minAvailable: 1`, and zero-trust NetworkPolicies active.

---

## 3. Operational Validation (Phase 4)

- **API & Web Startup**: Zero unhandled bootstrap errors; graceful shutdown hooks handle `SIGTERM` / `SIGINT` with configurable timeout (`GRACEFUL_SHUTDOWN_TIMEOUT_MS`).
- **Health & Readiness Probes**: `/health/live`, `/health/ready`, and `/health/startup` probes register active database connections, registered module statuses, and worker runtime states.
- **Queue & Error Tracking**: BullMQ queues process background jobs with dead-letter queue (DLQ) replaying; Error Tracking module captures unhandled 5xx exceptions with trace ID correlation.

---

## 4. Real Production Checklists (Phase 5)

### Deployment Checklist

- [x] Run `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm verify`.
- [x] Run `pnpm security:audit` and `pnpm load:test`.
- [x] Run `node scripts/verify-containers.js` and `node scripts/validate-manifests.js`.
- [x] Generate updated SBOM via `pnpm release`.
- [x] Apply database migrations: `pnpm --filter @college-hub/database db:migrate`.
- [x] Deploy Helm release: `helm upgrade --install collegehub infra/helm/collegehub -f infra/helm/collegehub/values.prod.yaml`.

### Smoke Test Checklist

- [ ] Verify API health endpoint: `GET http://<api-host>/health/ready` returns HTTP 200 `{"status":"UP"}`.
- [ ] Verify Web app root page load.
- [ ] Test student `.edu` email registration and OTP delivery.
- [ ] Verify student login and JWT token issue.
- [ ] Perform test query on Rate My Professor module (`/api/v1/professors`).
- [ ] Verify Prometheus `/metrics` scraping.

### Alpha & Closed Beta Checklist

- [ ] Onboard initial 5 partner colleges.
- [ ] Provision college admin accounts with RBAC roles.
- [ ] Validate multi-tenant RLS isolation between college domains.
- [ ] Monitor Error Tracking incident dashboard (`/admin/error-tracking`).

### Rollback Checklist

1. Scale down API deployment: `kubectl scale deployment/collegehub-api --replicas=0 -n collegehub-prod`.
2. Rollback Helm chart: `helm rollback collegehub -n collegehub-prod`.
3. Restore database snapshot if schema migration changed state: `pnpm backup restore-postgres --snapshot-id <snapshot-id>`.
4. Scale up API deployment and verify readiness probes.

### Incident & Monitoring Checklist

- [ ] Configure Alertmanager PagerDuty / Slack webhooks.
- [ ] Verify automated nightly backup CronJob execution.
- [ ] Monitor p95 latency (< 50ms SLA) and 5xx error rates (< 0.1%).
