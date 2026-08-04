# Closed Beta Deployment & Operator Guide

**Platform**: College Hub Enterprise SaaS Monolith  
**Release Tag**: `v1.0.0-beta`  
**Date**: August 4, 2026

---

## 1. Release Notes (v1.0.0-beta)

College Hub v1.0.0-beta introduces the production-ready multi-tenant college platform:

- **Core SaaS Business Platform**: Authentication, Security, Marketplace, Confessions, Academic Resources, Rate My Professor, Campus Connect, Placement Guidance, Placement Knowledge Base, Notification Engine, Notification Preferences.
- **Enterprise Infrastructure**: Helm chart deployment, Kubernetes HPA, ingress controller, zero-trust network policies, multi-stage hardened Docker images.
- **Observability & Resilience**: Prometheus metrics, OpenTelemetry distributed tracing, Grafana dashboards, alerting rules, Error Tracking & Incident Response (MS-56), automated Backup & PITR Disaster Recovery (MS-57).

---

## 2. Deployment Guide

### Prerequisites

- Kubernetes cluster (v1.28+) with NGINX Ingress Controller.
- Helm v3.12+ installed.
- PostgreSQL 16 database instance & Redis 7 cluster.
- S3-compatible object storage (MinIO / Cloudflare R2 / AWS S3).

### Deployment Steps

```bash
# 1. Clone & checkout v1.0.0-beta tag
git checkout tags/v1.0.0-beta

# 2. Render and validate Kubernetes manifests
pnpm infra:validate

# 3. Deploy Helm Chart to closed beta environment
helm upgrade --install collegehub infra/helm/collegehub \
  --namespace collegehub-staging \
  --create-namespace \
  -f infra/helm/collegehub/values.staging.yaml \
  --set secrets.postgresPassword="$DB_PASSWORD" \
  --set secrets.redisPassword="$REDIS_PASSWORD"

# 4. Verify deployment rollouts
kubectl rollout status deployment/collegehub-api -n collegehub-staging
kubectl rollout status deployment/collegehub-web -n collegehub-staging
kubectl rollout status deployment/collegehub-worker -n collegehub-staging
```

---

## 3. Operator Guide

### Health Probes & Monitoring

- **API Health Probe**: `http://<api-host>:4000/health` (liveness: `/health/live`, readiness: `/health/ready`)
- **Worker Health Probe**: `http://<worker-host>:4100/health/live`
- **Prometheus Metrics**: `http://<api-host>:4000/metrics`

### Troubleshooting & Incident Response

- Refer to runbooks under `docs/runbooks/`:
  - [api-unavailable.md](file:///C:/Users/SHITHIKANTA%20MAHADEV/OneDrive/Desktop/campizo/docs/runbooks/api-unavailable.md)
  - [database-outage.md](file:///C:/Users/SHITHIKANTA%20MAHADEV/OneDrive/Desktop/campizo/docs/runbooks/database-outage.md)
  - [full-disaster-recovery.md](file:///C:/Users/SHITHIKANTA%20MAHADEV/OneDrive/Desktop/campizo/docs/runbooks/full-disaster-recovery.md)
  - [deployment-rollback.md](file:///C:/Users/SHITHIKANTA%20MAHADEV/OneDrive/Desktop/campizo/docs/runbooks/deployment-rollback.md)

---

## 4. Rollback Guide

In the event of an operational anomaly during closed beta deployment:

```bash
# 1. Roll back Helm release to previous revision
helm rollback collegehub -n collegehub-staging

# 2. Verify restored deployments
kubectl get pods -n collegehub-staging

# 3. Perform database restore if schema migration rollback is required
pnpm backup restore-postgres --snapshot-id <pre-deployment-snapshot-id>
```

---

## 5. Go-Live & Post-Deployment Checklist

### Go-Live Checklist

- [x] All 23 packages pass `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm verify`.
- [x] Helm manifests validated with zero placeholder secrets.
- [x] Zero high/critical vulnerability findings (`pnpm security:audit`).
- [x] Load testing SLA verified (`pnpm load:test` p95 < 50ms).
- [x] Container specs verified non-root with healthchecks (`node scripts/verify-containers.js`).
- [x] Software Bill of Materials generated (`pnpm release`).

### Post-Deployment Checklist

- [ ] Confirm DNS and TLS certificate issuance for ingress hostnames.
- [ ] Verify Prometheus metric scraping on `/metrics` endpoint.
- [ ] Verify S3 backup WAL archiver sidecar connection.
- [ ] Perform smoke test on `.edu` authentication and user registration.
- [ ] Monitor Error Tracking dashboard (`/admin/error-tracking`) for zero unhandled exceptions.

---

## 6. Known Limitations

- **Error Tracking Storage**: MS-56 Error Tracking module currently uses an in-memory repository (persisted persistence provider planned for future enterprise milestone). Feature gated via `ERROR_TRACKING_ENABLED`.
- **DR Local Drill**: Automated DR restore test script (`scripts/dr-restore-test.sh`) requires Docker host execution for local compose testing.
