# MS-57 — Backup, Point-in-Time Recovery (PITR) & Disaster Recovery

- **Status**: Implemented (MS-57)
- **Depends on**: MS-06 (persistence), MS-54 (deployment platform), MS-55 (observability), MS-56 (error tracking)
- **Owner**: Platform Engineering

## 1. Objective

Protect every byte of College Hub application data — PostgreSQL, Redis and
MinIO media — with automated, verifiable backups, continuous WAL archiving for
point-in-time recovery, retention enforcement, and an automated disaster
recovery drill that proves data is restorable inside the RTO budget.

**Zero commercial SaaS dependency**: backups land in any S3-compatible object
store (bundled MinIO, Cloudflare R2, Google GCS interop, AWS S3) through a
hand-rolled SigV4 client.

### RTO / RPO targets

| Tier         | Component                         | RPO                             | RTO      |
| ------------ | --------------------------------- | ------------------------------- | -------- |
| Critical     | PostgreSQL (PITR)                 | < 15 min (WAL continuous)       | < 30 min |
| Critical     | PostgreSQL (full snapshot)        | < 24 h                          | < 30 min |
| High         | Redis (RDB)                       | ≤ 8 h (nightly + hourly option) | < 15 min |
| High         | MinIO media (mirror)              | < 24 h                          | < 1 h    |
| Non-critical | Cluster-scoped resources (Velero) | < 24 h                          | < 2 h    |

## 2. Architecture

```
                       ┌─────────────────────────────────────────────┐
                       │              Backup Object Store             │
                       │        (S3-compatible: MinIO / R2 / GCS)     │
                       │                                             │
                       │  collegehub-backups/                         │
                       │   ├── <prefix>/postgres/full/<id>/…         │
                       │   ├── <prefix>/postgres/base/<id>/…         │
                       │   ├── <prefix>/postgres/wal/<segment>       │
                       │   ├── <prefix>/redis/rdb/<id>/…             │
                       │   └── <prefix>/minio/mirror/<id>/…          │
                       └───────────────▲─────────────────▲───────────┘
                                       │                 │
        nightly run-all (CronJob)      │                 │ WAL archiver sidecar
   ┌───────────────────────────────────┴───┐   ┌─────────┴──────────────────┐
   │ backup CLI (Dockerfile.backup)        │   │ wal-forward (in postgres  │
   │  create-postgres → pg_dump            │   │ pod): archive_command     │
   │  create-redis → SAVE + RDB upload     │   │ writes /wal-archive;      │
   │  mirror-minio → object copy           │   │ sidecar uploads+deletes   │
   │  verify → sha256 + archive integrity  │   └───────────────────────────┘
   │  cleanup → retention policy           │
   └───────────────────────────────────────┘
```

- **Full snapshots**: nightly CronJob runs the `run-all` command — PostgreSQL
  logical snapshot (`pg_dump`, custom format), Redis RDB (`SAVE` + upload),
  MinIO mirror, verification and retention cleanup in one atomic run.
- **WAL archiving**: with the bundled PostgreSQL StatefulSet, `archive_command`
  copies segments into a shared staging dir and a `wal-forward` sidecar uploads
  them to the object store (removing them locally after upload). With
  externally managed PostgreSQL (RDS etc.), point `archive_command` /
  `restore_command` at the `backup archive-wal` / `backup fetch-wal` CLI
  commands.
- **PITR**: restore a base snapshot into a fresh data directory, then apply WAL
  segments up to a target time (`backup restore-pitr` writes
  `postgresql.auto.conf` + `recovery.signal`).
- **Verification**: every snapshot stores a SHA-256 of the artifact; `verify`
  re-downloads it, re-hashes, and validates the archive listing before the
  snapshot counts as healthy.
- **Retention**: `backup cleanup` enforces full-backup count, WAL age, Redis
  snapshot count and mirror count policies (defaults: 7 full, 72 h WAL,
  3 RDB, 7 mirrors).
- **Drill**: `pnpm backup:drill` (scripts/dr-restore-test.sh) spins up an
  isolated PostgreSQL, restores the latest snapshot into it, and compares
  normalized dumps byte-for-byte, failing the drill on any mismatch.

## 3. Package layout

| Path                                              | Responsibility                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/backup/src/config.ts`                   | Zod `BACKUP_*` env schema + fallbacks to `S3_*`/`DATABASE_URL`/`REDIS_URL`             |
| `packages/backup/src/object-store/`               | `ObjectStore` contract, zero-dep SigV4 S3 client, `S3ObjectStore` + `LocalObjectStore` |
| `packages/backup/src/services/postgres-backup.ts` | logical/physical snapshots, WAL archive/fetch, restore, PITR, verify                   |
| `packages/backup/src/services/redis-backup.ts`    | RDB snapshot/download/verify/list                                                      |
| `packages/backup/src/services/minio-backup.ts`    | bucket mirror/verify/list                                                              |
| `packages/backup/src/retention.ts`                | retention policy enforcement                                                           |
| `packages/backup/src/orchestrator.ts`             | `BackupOrchestrator.runAll()` + `createObjectStore`                                    |
| `packages/backup/src/metrics.ts`                  | `collegehub_backup_*` Prometheus metrics                                               |
| `packages/backup/src/cli.ts`                      | `backup` CLI (13 commands)                                                             |
| `packages/backup/test/`                           | 20 tests (fake in-process S3 server + services)                                        |

## 4. Operations

### Environment variables (chart-injected)

| Variable                                                  | Purpose                                                |
| --------------------------------------------------------- | ------------------------------------------------------ |
| `BACKUP_PROVIDER`                                         | `s3` (default) or `local` (offline dev)                |
| `BACKUP_S3_ENDPOINT`                                      | Object store endpoint (MinIO/R2/GCS/S3)                |
| `BACKUP_S3_BUCKET`                                        | Backup bucket (separate from media bucket)             |
| `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` | Backup store credentials (dedicated user recommended)  |
| `BACKUP_POSTGRES_URL`                                     | Source database URL (falls back to `DATABASE_URL`)     |
| `BACKUP_REDIS_URL`                                        | Source Redis URL (falls back to `REDIS_URL`)           |
| `BACKUP_PREFIX`                                           | Object key prefix per environment                      |
| `BACKUP_RETENTION_*`                                      | fullBackups / walHours / redisSnapshots / minioMirrors |
| `BACKUP_VERIFY_AFTER_CREATE`                              | Verify snapshots as part of `run-all`                  |

### CLI commands

```
backup run-all | create-postgres [--type logical|physical] | create-redis |
       mirror-minio | verify [--kind postgres|redis|minio] [--id <id>] |
       restore-postgres --target <url> [--id <id>] |
       restore-redis --id <id> --output <file> |
       restore-pitr --base-id <id> [--target-time <iso>] --data-dir <dir> |
       archive-wal --segment-file <path> | fetch-wal --segment <name> --dest <path> |
       wal-forward --dir <path> [--metrics-port <n>] |
       list [--kind postgres|redis|minio] | cleanup
```

### Kubernetes (Helm)

| Resource                                                   | Purpose                                                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `CronJob collegehub-backup`                                | Nightly `run-all` (schedule `backup.runAll.schedule`, default `0 2 * * *`)                                        |
| `CronJob collegehub-backup-redis` / `-minio`               | Optional extra cadence (empty schedule = disabled)                                                                |
| `StatefulSet postgres` sidecar `wal-archive`               | WAL archiver when `postgresql.enabled` (bundled)                                                                  |
| `Job collegehub-backup-restore`                            | On-demand restore (`backup.restore.enabled=true`)                                                                 |
| `NetworkPolicy collegehub-backup-egress` (+ `-wal-egress`) | Backup egress: DNS, 5432/6379/9000, 80/443                                                                        |
| `PodMonitor collegehub-backup-wal`                         | Scrapes `wal-metrics` port on the postgres pod                                                                    |
| `PrometheusRule collegehub-backup`                         | `CollegeHubBackupJobFailed`, `CollegeHubBackupStale`, `CollegeHubWalArchiverDown`, `CollegeHubWalSegmentsStalled` |
| `ConfigMap collegehub-backup` dashboard                    | Backup Grafana dashboard (last success, outcomes, WAL lag)                                                        |
| Velero                                                     | Optional cluster-scoped backups via `backup.velero.enabled` (annotation + schedule on the CronJob)                |

### Restoring

1. **List** available snapshots: `pnpm backup:list` (or `backup list --kind …`).
2. **Full PostgreSQL restore to a new cluster**: render the restore Job
   (`backup.restore.enabled=true`, `backup.restore.targetUrl=<new db>`) and
   `helm upgrade`, or run locally:
   `pnpm backup restore-postgres --target postgresql://user:pass@host:5432/db --id <snapshot-id>`.
3. **PITR**: provision a fresh PostgreSQL 16 data directory, then
   `pnpm backup restore-pitr --base-id <id> --target-time 2026-08-04T12:30:00Z --data-dir /tmp/pgdata`
   (with `BACKUP_RESTORE_COMMAND` = `backup fetch-wal --segment %f --dest %p` on the restore host).
4. **Redis**: `pnpm backup restore-redis --id <id> --output dump.rdb`, stop Redis,
   replace `dump.rdb`, start Redis.
5. **MinIO**: run `backup mirror-minio` with source/target swapped or restore
   objects from `minio/mirror/<id>/` via `mc cp`.

## 5. DR Drill

`bash scripts/dr-restore-test.sh` (root script `pnpm backup:drill`):

1. Starts local compose PostgreSQL + MinIO.
2. Builds `collegehub-backup:local` from `Dockerfile.backup` (cached).
3. Creates + verifies a logical snapshot through the CLI.
4. Starts an isolated restore-target PostgreSQL container.
5. Restores the snapshot into it.
6. Compares normalized `pg_dump` schema + data checksums (and row counts).
7. Reports measured RTO; fails the drill if > 15 minutes or on any mismatch.

Run it in CI on every release or on a schedule; it exercises the exact image
and CLI that production CronJobs use.

## 6. Alerting & Monitoring

- **Metrics**: `collegehub_backup_jobs_total`, `_last_success_timestamp_seconds`,
  `_duration_seconds`, `_objects_total`, `_bytes_total` on the shared
  observability registry (WAL sidecar via PodMonitor; CronJobs via
  kube-state-metrics).
- **Alerts**: backup job failure (critical), no backup in 50 h (critical),
  WAL archiver down (critical), no WAL archived in 1 h (warning).
- **Dashboard**: `College Hub — Backup & Recovery` (Grafana ConfigMap sidecar).

## 7. Documentation

Runbooks (all under `docs/runbooks/`):

| Runbook                     | Scenario                                          |
| --------------------------- | ------------------------------------------------- |
| `postgres-pitr-restore.md`  | PostgreSQL data loss — point-in-time restore      |
| `postgres-full-restore.md`  | PostgreSQL loss — restore to a new cluster        |
| `redis-restore.md`          | Redis data loss — RDB restore                     |
| `minio-restore.md`          | Media object store loss — mirror restore          |
| `backup-store-outage.md`    | Backup object store unavailable                   |
| `namespace-deletion.md`     | Namespace / cluster deletion recovery             |
| `full-disaster-recovery.md` | Region/zone loss — full recovery to a new cluster |

See also: `docs/architecture/` (platform design), `docs/database/` (schema),
`docs/MASTER_ROADMAP.md` (MS-57 checklist).

## 8. Production Checklist

- [ ] `BACKUP_S3_*` set in Secret with a dedicated backup user (revocable independently of media access).
- [ ] Object store has versioning enabled on the backup bucket.
- [ ] Bucket lifecycle purges objects older than the retention horizon (safety net beyond the in-app retention).
- [ ] WAL archiving verified: segments appear in `<prefix>/postgres/wal/` within `archive_timeout`.
- [ ] `CollegeHubBackupJobFailed` / `CollegeHubBackupStale` routes to the on-call channel.
- [ ] DR drill runs on a schedule (nightly or per-release) and its last run passed.
- [ ] Restore credentials (R2/S3 access to the backup bucket) tested from a host _outside_ the cluster.
- [ ] Externally managed PostgreSQL: `archive_command` / `restore_command` point at the CLI (see `postgres-pitr-restore.md`).
