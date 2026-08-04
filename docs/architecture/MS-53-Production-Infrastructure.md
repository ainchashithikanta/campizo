# Production Infrastructure & CI/CD Documentation (MS-53)

## 1. CI/CD Workflows (`.github/workflows/`)

| Workflow File | Trigger | Purpose |
| :--- | :--- | :--- |
| `ci.yml` | Push / PR to `main` or `develop` | Validates pnpm lockfile, runs `type-check`, `lint`, Vitest test suite across all 20 workspace projects, and builds production bundles. |
| `security.yml` | Push / PR & Daily Cron (2 AM UTC) | Runs `pnpm audit --audit-level=high`, generates SBOM JSON compliance report (`scripts/generate-sbom.js`), and uploads artifacts. |
| `release.yml` | Manual (`workflow_dispatch`) | Bundles production application artifacts into semantic versioned tarballs. |
| `nightly.yml` | Nightly Cron (Midnight UTC) | Full workspace regression test suite, dependency security scan, and build verification. |

---

## 2. Docker Architecture & Container Specifications

- **`Dockerfile.api`**: Multi-stage build for Fastify 5 REST API micro-services. Runs as non-root user `nodeuser` on Node.js 20 Alpine with HTTP `/health` probe.
- **`Dockerfile.web`**: Multi-stage build for Next.js 16 App Router interface. Runs as non-root user `nextjs` on Node.js 20 Alpine.
- **`Dockerfile.worker`**: Multi-stage worker process for BullMQ background event processing.

---

## 3. Docker Compose Infrastructure Profiles

```
docker-compose.yml          # Local development profile (Postgres 16 pgvector, Redis 7, MinIO S3, Mailpit)
docker-compose.staging.yml  # Isolated staging environment (Ports 4001, 5433, 6380)
docker-compose.prod.yml     # Production cluster deployment with container healthchecks & resource limits
```

---

## 4. GitHub Branch Protection Policy Requirements

1. **Required Status Checks**:
   - `Validate, Test & Build Workspace` (`ci.yml`) MUST pass.
   - `Dependency Audit & Secret Scanning` (`security.yml`) MUST pass.
2. **Pull Request Rules**:
   - Require 1 approving review from Lead Staff Software Engineer / CTO.
   - Require linear history (No merge commits).
   - Dismiss stale pull request approvals when new commits are pushed.
3. **Admin Restrictions**:
   - Force pushes are strictly disabled on `main` and `develop`.
   - Direct pushes to `main` are disabled.

---

## 5. Developer Workflows & Commands

```bash
pnpm dev         # Run all apps & modules in parallel development mode
pnpm build       # Build production outputs across Turborepo graph
pnpm type-check  # Verify 0 TypeScript compilation errors
pnpm test        # Execute Vitest test suite across all workspaces
pnpm verify      # Full pre-flight build and test verification script
```
