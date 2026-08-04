# Runbook: Full Disaster Recovery to a New Region / Cluster

- **ID**: `full-disaster-recovery`
- **Severity**: CRITICAL
- **Trigger**: Region/zone outage, provider account termination, or a
  decision to move the platform to a new region/cluster. The current cluster
  may still be partially alive; treat it as untrusted once the decision is made.

## Design principles

- The backup object store is **geo-independent** (R2 / GCS / S3 with
  cross-region or off-cluster placement) — the DR anchor.
- Everything else is rebuilt from Git (`infra/helm/collegehub` is the source
  of truth; `scripts/render-manifests.js` produces plain manifests for any
  GitOps pipeline).
- Data restore order: PostgreSQL first (source of truth), then Redis (cache),
  then MinIO media.

## Steps

1. **Declare DR** and freeze all writes in the old region (remove API from
   DNS, stop worker consumers).

2. **Provision the new cluster**: kubeconfig, storage classes, ingress
   controller, kube-prometheus-stack (Prometheus Operator CRDs), cert-manager,
   sealed secrets (or External Secrets Operator).

3. **Deploy the chart**:

   ```bash
   helm upgrade --install collegehub infra/helm/collegehub -n collegehub-prod \
     -f infra/helm/collegehub/values.prod.yaml \
     --set global.namespace=collegehub-prod \
     --set global.environment=production
   ```

4. **Restore data**:
   - PostgreSQL: follow `postgres-full-restore.md` (snapshot) then
     `postgres-pitr-restore.md` (roll forward to the freeze moment).
   - Redis: `redis-restore.md`.
   - MinIO: `minio-restore.md` (mirror back; media can stream in while
     restoring if the API tolerates missing objects).
   - Secrets: re-apply `secrets.*` (SealedSecrets/ESO from the DR store).

5. **Verify**:
   - `bash scripts/dr-restore-test.sh` against the new environment (must pass
     before traffic cutover).
   - Health endpoints, checksums, spot-check user-facing media, job queues drain.
   - Record measured RTO (target < 2 h for the full stack; < 30 min critical data).

6. **Cut over DNS** and watch error tracking for a clean start
   (`errorTracking` incident count, API 5xx rate).

## Escalation

- Data restore must start in the first 15 minutes; the incident commander
  tracks the RTO clock on the whiteboard.
- If the backup store is in the dead region: failover to the secondary store
  (versioning/geo-replication), then proceed with whatever is available.

## Post-incident

- Produce a DR report: RTO vs target, restore times per component, what
  degraded (e.g. media streaming during restore).
- Drill the new region monthly with `backup:drill` + a full chart render
  (`pnpm infra:validate`).
- Keep this runbook's prerequisites (DR credentials, kubeconfig, DNS access)
  in the DR vault, tested every quarter.
