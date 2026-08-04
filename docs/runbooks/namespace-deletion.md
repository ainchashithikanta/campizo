# Runbook: Namespace / Cluster Deletion Recovery

- **ID**: `namespace-deletion`
- **Severity**: CRITICAL
- **Trigger**: Entire `collegehub-*` namespace deleted (accidental
  `kubectl delete ns`, GitOps misapply) or the whole cluster lost.

## What survives

- **Application data**: the backup object store (S3-compatible) lives outside
  the cluster and is untouched by a namespace deletion — PostgreSQL snapshots
  - WAL, Redis RDBs and MinIO mirrors are all still restorable.
- **Cluster-scoped resources**: with `backup.velero.enabled=true`, Velero
  schedules capture namespaces, PVCs and CRDs. Without Velero, all resources
  are recreated from the Helm chart (source of truth in Git).

## Steps

1. **Freeze the namespace**: confirm nothing is writing (API is down anyway
   once the namespace is gone).

2. **Recreate the platform** from Git:

   ```bash
   helm repo add prometheus-community …   # if monitoring CRDs were lost
   kubectl create ns collegehub-prod
   helm upgrade --install collegehub infra/helm/collegehub -n collegehub-prod \
     -f infra/helm/collegehub/values.prod.yaml \
     --set global.namespace=collegehub-prod
   ```

3. **Restore the data** (order matters):
   - PostgreSQL: `postgres-full-restore.md` (restore into the fresh
     StatefulSet; then PITR roll-forward with `postgres-pitr-restore.md`).
   - Redis: `redis-restore.md` (RDB into the fresh StatefulSet).
   - MinIO: `minio-restore.md` (mirror back into the media bucket).
   - If Velero was enabled: `velero restore create --from-backup <name>`
     instead — it recreates PVCs in place (verify application data after).

4. **Restore the backup store wiring**: recreate `collegehub-prod-secret`
   with `BACKUP_S3_*` credentials, confirm the nightly CronJob and WAL sidecar
   resume, and run `backup run-all` once to re-baseline.

5. **Validate**: run `bash scripts/dr-restore-test.sh` against the new
   environment, check health endpoints, spot-check media URLs.

## Escalation

- The whole point of the DR pipeline: RTO < 30 min for critical data once
  storage is available. If the backup store itself was deleted with the
  cluster (bad practice), recovery falls back to object-store provider
  versioning/undelete — engage the provider immediately.

## Post-incident

- Enforce Velero (or equivalent) with backups stored outside the cluster.
- Add a guard (RBAC) preventing namespace deletion in production.
- Re-run the full DR drill and record the new baseline RTO.
