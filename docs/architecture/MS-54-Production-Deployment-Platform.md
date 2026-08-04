# Production Deployment Platform Documentation (MS-54)

## 1. Overview

MS-54 transforms the College Hub deployment story from Docker-first to a
**production-grade Kubernetes deployment platform**. Kubernetes and Helm become
the single production deployment solution; Docker Compose is demoted to a
local-development-only tool.

The platform is **provider-neutral**: the same chart deploys to AWS EKS, Google
GKE, Azure AKS, DigitalOcean Kubernetes, and self-hosted clusters **without any
application code changes**.

---

## 2. Core Principles

| Principle | Implementation |
| :--- | :--- |
| Production = Kubernetes | All app workloads run as Deployments managed by a Helm chart |
| Provider neutrality | No cloud-specific CRDs, Ingress controllers, or CSI secrets; external dependencies are plain endpoints |
| GitOps friendly | Plain manifests are rendered and committed under `infra/k8s/render/<env>` |
| Zero-Touch scaling | HPA (CPU + memory) on API / web / worker |
| Resilience | Rolling updates (`maxUnavailable: 0`), PodDisruptionBudgets, readiness/liveness probes |
| Security first | Non-root UIDs, no automount SA tokens, default-deny ingress + port-scoped egress NetworkPolicies, per-env namespace isolation |
| Migrations | Pre-install/pre-upgrade Helm hook runs Drizzle migrations before rollout |

---

## 3. Repository Layout

```
Dockerfile.api        # Fastify API image            -> node apps/api/dist/server.js
Dockerfile.web        # Next.js standalone image      -> node apps/web/server.js
Dockerfile.worker     # Background worker image       -> node apps/worker/dist/index.js

apps/worker/          # NEW background worker workspace (health server, graceful shutdown)

infra/helm/collegehub/
  Chart.yaml
  values.yaml                     # production defaults (external deps, HA)
  values.dev.yaml                 # bundled Postgres/Redis/MinIO, single replica
  values.staging.yaml             # HA-lite, external deps, staging TLS
  values.prod.yaml                # full HA, external deps, prod TLS
  templates/
    _helpers.tpl
    namespace.yaml                # per-env namespace isolation
    serviceaccount.yaml           # no automount of API token
    configmap.yaml                # non-secret runtime config
    secret.yaml                   # DATABASE_URL/REDIS_URL derived from values
    api-deployment.yaml / api-service.yaml / api-hpa.yaml / api-pdb.yaml
    web-deployment.yaml / web-service.yaml / web-hpa.yaml / web-pdb.yaml
    worker-deployment.yaml / worker-hpa.yaml / worker-pdb.yaml
    migrations-job.yaml           # pre-install/pre-upgrade hook
    ingress.yaml
    networkpolicy.yaml            # default-deny ingress + scoped egress
    postgres.yaml                 # opt-in StatefulSet (pgvector)
    redis.yaml                    # opt-in StatefulSet
    minio.yaml                    # opt-in Deployment + PVC

infra/k8s/render/<env>/all.yaml   # committed, helm-template rendered manifests

scripts/render-manifests.js       # renders the chart for all/single environment
scripts/validate-manifests.js     # offline sanity check of rendered manifests

.github/workflows/deploy-validation.yml  # helm lint + kubeconform + docker build
```

---

## 4. Deployable Components

| Component | Image | Port | Probes | Scaling |
| :--- | :--- | :--- | :--- | :--- |
| `api` | `collegehub-api` | 4000 | `/health/live`, `/health/ready` | HPA 3-12 (prod) |
| `web` | `collegehub-web` | 3000 | `/` HTTP | HPA 3-12 (prod) |
| `worker` | `collegehub-worker` | 4100 | `/health/live`, `/health/ready` | HPA 2-8 (prod) |
| `migrations` | reuses API image | – | Job (hook) | `backoffLimit: 4` |

Every app container runs as **non-root UID 1001**, matching the Dockerfile
`nodeuser` / `nextjs` / `workeruser` accounts.

---

## 5. Environment Overlays

| Env | Namespace | Replicas | Datastores | NetworkPolicies | Ingress |
| :--- | :--- | :--- | :--- | :--- | :--- |
| dev | `collegehub-dev` | 1/1/1 | bundled (opt-in) | disabled | disabled |
| staging | `collegehub-staging` | 2/2/1 | external | enabled | staging TLS |
| prod | `collegehub-prod` | 3/3/2 | external | enabled | prod TLS |

Secrets in `values.*.yaml` are **placeholders**. Production secrets must be
injected via SealedSecrets, the External Secrets Operator, or cloud KMS.

---

## 6. Deployment Guide (any provider)

```bash
# 1. Validate the chart locally
pnpm infra:lint          # helm lint infra/helm/collegehub
pnpm infra:render        # render dev/staging/prod manifests
pnpm infra:validate      # offline sanity checks

# 2. Deploy (requires a cluster + helm)
helm repo update
helm upgrade --install collegehub infra/helm/collegehub \
  --namespace collegehub-prod \
  -f infra/helm/collegehub/values.prod.yaml \
  --set global.namespace=collegehub-prod \
  --set image.tag=<release-tag>

# 3. GitOps (offline review)
git diff infra/k8s/render/prod/all.yaml   # commit rendered manifests
```

Cloud-specific notes (no chart changes required):

- **AWS EKS** — set `external.databaseHost` to the RDS endpoint, `secrets.redisUrl`
  to ElastiCache, `secrets.databaseUrl` to RDS, storage to S3.
- **GKE** — same pattern with Cloud SQL / Memorystore / GCS.
- **Azure AKS** — Azure Database for PostgreSQL / Cache for Redis / Blob Storage.
- **DigitalOcean** — Managed Postgres / Managed Redis / Spaces.
- **Self-hosted** — use the bundled `postgresql`/`redis`/`minio` opt-in
  StatefulSets (`values.dev.yaml` demonstrates this).

---

## 7. Kubernetes Resource Coverage (MS-54 requirements)

| Requirement | Resource |
| :--- | :--- |
| Namespace isolation | `Namespace` per environment |
| ConfigMaps | `collegehub-config` (runtime config) |
| Secrets | `collegehub-secret` (derived connection URLs + keys) |
| ServiceAccounts | least-privilege, no API token automount |
| Deployments / Services | API, web, worker (ClusterIP) |
| HPA | CPU + memory autoscaling per component |
| Ingress | `/api` -> api, `/` -> web, TLS ready |
| PDB | `minAvailable: 1` per component |
| NetworkPolicies | default-deny ingress, ingress-controller/web allowed in, port-scoped egress |
| Jobs | pre-upgrade migration hook |

---

## 8. Docker Compose Demotion

`docker-compose.yml` now carries a **LOCAL DEVELOPMENT ONLY** banner. The staging
and prod Compose files are marked **DEPRECATED**; they are retained only for
local experimentation. Production and staging run exclusively on Kubernetes.

---

## 9. CI/CD Validation (`.github/workflows/deploy-validation.yml`)

| Job | Purpose |
| :--- | :--- |
| `helm-lint` | `helm lint` + template render of all three environments |
| `kubeconform` | Schema validation (`-strict`) of every rendered manifest |
| `docker-build` | Builds `api`, `web`, `worker` images to catch Dockerfile regressions |

---

## 10. Audit Findings Resolved

| Finding | Resolution |
| :--- | :--- |
| `Dockerfile.api` CMD pointed at missing `dist/index.js` | CMD -> `node apps/api/dist/server.js` |
| `Dockerfile.web` referenced non-existent app node_modules | Rewritten for Next.js standalone output |
| `Dockerfile.worker` was a placeholder `setInterval` | Real worker image -> `node apps/worker/dist/index.js` |
| No worker application existed | New `@college-hub/worker` workspace with health server + graceful shutdown |
| No liveness/readiness endpoints | `/health/live`, `/health/ready` on API and worker |
| `infra/k8s/base` contained hard-coded secrets | Removed; chart renders secrets from values/overlays |
| No migration artifacts | Migration Job guards on folder existence (`db:generate` before real use) |

---

## 11. Verification

```bash
pnpm type-check   # 0 TypeScript errors
pnpm test         # all Vitest suites green (API incl. health probes, worker)
pnpm build        # all workspaces build
helm lint         # chart lints clean
helm template     # dev/staging/prod render
node scripts/validate-manifests.js   # offline manifest checks pass
```

## 12. Known Follow-Ups

- Fastify version skew (`api` v4 vs `connect` module v5) is tracked separately
  (see `docs/TECH_DEBT.md`); unify on Fastify 5.
- Generate and commit Drizzle migration artifacts before first real deployment.

## 13. Future Roadmap (deferred by design)

These were explicitly scoped out of MS-54. The chart is already shaped for them:
manifest-based GitOps is compatible with the committed `infra/k8s/render/<env>`
output, and secrets are injected via env/`secretRef`, so a secret manager can
replace placeholder values without rebuilding manifests.

- **GitOps with ArgoCD** — GitHub → ArgoCD → cluster. Git becomes the deployment
  source; no manual `kubectl apply`/`helm upgrade` against prod. The rendered
  `infra/k8s/render/<env>/all.yaml` artifacts (or ArgoCD Application + the Helm
  chart) are the target-of-truth, with sync/revert/reporting handled by ArgoCD.
- **External Secrets Operator (ESO)** — replace static Kubernetes `Secret`
  objects with `ExternalSecret` resources backed by AWS Secrets Manager, HashiCorp
  Vault, or Azure Key Vault. Secret rotation happens without editing or
  re-rendering manifests. All workloads already consume secrets via
  `envFrom.secretRef`, so the swap is additive.

