# Runbook: PostgreSQL Full Restore to a New Cluster

- **ID**: `postgres-full-restore`
- **Severity**: CRITICAL
- **Trigger**: Primary database volume lost/corrupted and unrecoverable;
  cluster node destroyed; operator decides to rebuild PostgreSQL from backups
  rather than repair in place.

## Goal

Restore the newest verified snapshot into a brand-new PostgreSQL cluster
(data loss bounded by the snapshot cadence: < 24 h, or minutes with WAL+PITR —
see `postgres-pitr-restore.md`).

## Steps

1. **List snapshots and pick the newest verified one**:

   ```bash
   backup list --kind postgres
   # 2026-08-04T02-00-00.000Z  logical  123456789 bytes  sha256 a1b2c3d4…
   ```

2. **Verify it once more** before touching anything:

   ```bash
   backup verify --kind postgres --id 2026-08-04T02-00-00.000Z
   # PostgreSQL snapshot <id>: OK — sha256 match, archive listing valid
   ```

3. **Provision a new PostgreSQL 16** (in-cluster: enable `postgresql.enabled`
   in a fresh namespace, or spin up a VM; on RDS: restore the latest automated
   snapshot, then import the dump below).

4. **Restore the snapshot** with the CLI or the Helm restore Job:

   ```bash
   # CLI (any host with pg_restore 16 + backup CLI):
   backup restore-postgres \
     --target postgresql://collegehub_user:NEW_PASSWORD@new-host:5432/collegehub_db \
     --id 2026-08-04T02-00-00.000Z

   # or Kubernetes:
   helm upgrade collegehub infra/helm/collegehub -n collegehub-prod \
     -f infra/helm/collegehub/values.prod.yaml \
     --set backup.restore.enabled=true \
     --set backup.restore.id=2026-08-04T02-00-00.000Z \
     --set backup.restore.targetUrl='postgresql://collegehub_user:NEW_PASSWORD@new-host:5432/collegehub_db'
   kubectl -n collegehub-prod wait --for=condition=complete job/collegehub-backup-restore --timeout=20m
   # then disable the restore Job:
   helm upgrade collegehub infra/helm/collegehub -n collegehub-prod \
     -f infra/helm/collegehub/values.prod.yaml --set backup.restore.enabled=false
   ```

5. **Validate**: query known data, run application smoke tests, compare row
   counts with the pre-incident monitoring baselines.

6. **Point traffic at the new cluster**: update `secrets.databaseUrl` +
   `secrets.POSTGRES_PASSWORD`, `helm upgrade`, restart API/worker.

7. **Repoint WAL archiving** at the new primary and confirm segments land in
   the object store again (`CollegeHubWalArchiverDown` clears).

## Escalation

- > 30 min (RTO): page platform engineering; consider restoring to the latest
  > full snapshot without extra validation to unblock, then backfill PITR.
- Snapshot verification fails: fall back to the previous snapshot and file an
  incident for the failed one (`backup verify` output goes to the runbook log).

## Post-incident

- Run `bash scripts/dr-restore-test.sh` to prove the pipeline end-to-end.
- If the loss was due to deletion: review object-store lifecycle rules and
  enable versioning on the backup bucket.
