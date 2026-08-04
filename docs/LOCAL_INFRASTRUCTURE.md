# College Hub: Local Infrastructure Setup & Operating Guide (MS-02)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Local Infrastructure Operations Guide
- **Document Version**: 1.0.0-FINAL
- **Status**: Official Infrastructure Specification (MS-02 Complete)

---

## 1. Local Service Architecture Matrix

The local development environment uses containerized Docker services running inside an isolated bridge network (`collegehub_net`).

| Service                   | Image                    | Internal Port | Host Port       | Credentials / Config                      | Health Check Command                              |
| :------------------------ | :----------------------- | :------------ | :-------------- | :---------------------------------------- | :------------------------------------------------ |
| **PostgreSQL + pgvector** | `pgvector/pgvector:pg16` | 5432          | `5432`          | `collegehub_user` / `collegehub_password` | `pg_isready -U collegehub_user -d collegehub_db`  |
| **Redis Cache & Queue**   | `redis:7-alpine`         | 6379          | `6379`          | Append-only enabled                       | `redis-cli ping`                                  |
| **MinIO S3 Store**        | `minio/minio`            | 9000 / 9001   | `9000` / `9001` | `minioadmin` / `minioadmin`               | `curl -f http://localhost:9000/minio/health/live` |
| **Mailpit SMTP & UI**     | `axllent/mailpit:v1.18`  | 1025 / 8025   | `1025` / `8025` | Web Console on `8025`                     | `curl -f http://localhost:8025/api/v1/info`       |

---

## 2. Environment Setup Instructions

### Prerequisites

- **Docker Desktop** (Windows / macOS) or **Docker Engine + Docker Compose v2** (Linux).
- **Node.js** v20 LTS or higher.
- **pnpm** v9+.

### Quickstart Command

```bash
# 1. Initialize environment variables from template
cp .env.example .env

# 2. Launch all infrastructure containers
pnpm db:up

# 3. Check health status of running services
pnpm db:status

# 4. Stop all infrastructure containers when finished
pnpm db:down
```

---

## 3. OS-Specific Setup Guides

### Windows (WSL2 / PowerShell)

1. Ensure Docker Desktop is installed with the **WSL2 Backend** enabled.
2. In PowerShell, execute `pnpm db:up`.
3. If script execution policy errors occur, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### macOS (Apple Silicon / Intel)

1. Ensure Docker Desktop for Mac is running.
2. Apple Silicon (M1/M2/M3) chips natively support `pgvector/pgvector:pg16` and `redis:7-alpine` multi-arch arm64 images.
3. Execute `pnpm db:up`.

### Linux (Ubuntu / Debian / RHEL)

1. Install Docker Compose plugin: `sudo apt install docker-compose-v2`.
2. Add user to docker group: `sudo usermod -aG docker $USER`.
3. Execute `pnpm db:up`.

---

## 4. Troubleshooting & FAQ

### Issue 1: `bind: address already in use` (Port Collision)

- **Symptom**: Docker error stating port `5432` or `6379` is already allocated.
- **Solution**:
  1. Check what service is listening on port 5432:
     - Windows: `netstat -ano | findstr :5432`
     - Linux/Mac: `lsof -i :5432`
  2. Stop local standalone PostgreSQL or Redis services:
     - Windows: Stop `postgresql-x64` service in `services.msc`.
     - Linux: `sudo systemctl stop postgresql redis-server`.
  3. Alternatively, update `POSTGRES_PORT` or `REDIS_PORT` in your `.env` file to an unused port (e.g. `5433`).

### Issue 2: PostgreSQL RLS / Extension Error

- **Symptom**: `pgvector` extension or `CURRENT_SETTING` error.
- **Solution**: `pgvector/pgvector:pg16` includes vector search capabilities out-of-the-box. Ensure you are using `pgvector/pgvector:pg16` in `docker-compose.yml`, not standard `postgres:16`.

### Issue 3: MinIO S3 Pre-Signed Upload Fails

- **Symptom**: MinIO pre-signed URL generates `http://minio:9000` instead of `http://localhost:9000`.
- **Solution**: Ensure `S3_FORCE_PATH_STYLE=true` and `S3_ENDPOINT=http://localhost:9000` are configured in `.env`.

---

## 5. Architectural Decisions & Future Independence

1. **Independent Container Replaceability**: Every service operates within its own container definition bound to standard protocols (Postgres protocol, Redis RESP, S3 API, SMTP). Cloud providers (AWS Aurora Postgres, AWS ElastiCache, Cloudflare R2, AWS SES) can replace any container without application code modifications.
2. **Resource Reservation & Hard Limits**: Every service includes explicit `cpu` and `memory` limits in `docker-compose.yml` to prevent local container resource starvation.
3. **Healthcheck Dependency Chain**: Fastify backend applications defer startup until `postgres` and `redis` report healthy status via Docker healthchecks.

---

_End of Local Infrastructure Guide._
