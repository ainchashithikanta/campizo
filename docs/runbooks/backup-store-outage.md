# Runbook: Backup Object Store Unavailable

- **ID**: `backup-store-outage`
- **Severity**: HIGH
- **Trigger**: `CollegeHubBackupJobFailed` + `CollegeHubWalArchiverDown` fire
  together; `backup` CLI errors with `S3Error` (connection refused,
  `NoSuchBucket`, 403/429).

## Impact

- Nightly snapshots stop (RPO starts growing past 24 h).
- WAL archiving stops (PITR window stops moving; RPO degrades to snapshot cadence).
- **The application itself keeps running** — reads/writes to
  `collegehub-media` and PostgreSQL are unaffected.

## Steps

1. **Confirm scope**: `backup list --kind postgres` from an operator host;
   check the object store status page / provider dashboard.

2. **Keep the write path safe**:
   - Bundled MinIO: `kubectl -n <env> get pods -l app.kubernetes.io/name=minio`;
     check PVC status, node disk space, MinIO console.
   - External (R2/GCS/S3): provider status page; credentials/keys might have
     rotated — check `collegehub-backup-secret` `BACKUP_S3_*` values.

3. **Fix the store**: restore the PVC from backup (see `minio-restore.md`),
   re-create the bucket, or re-provision credentials. Recreating the bucket
   requires restoring its contents: point a one-off
   `backup restore-*` / `mc cp` job at the last mirror **from another store**
   if available, otherwise accept the gap.

4. **Do not restart the WAL sidecar blindly**: the archiver holds up to
   `archive_timeout` of WAL in the pod; if the pod restarts, un-uploaded
   segments are lost. Wait for the store to recover first, or snapshot the
   staging dir (`kubectl cp`) before a restart.

5. **Catch up after recovery**: run `backup run-all` on-demand (creates fresh
   snapshots + enforces retention), then confirm segments resume:
   `backup list --kind postgres` shows today's WAL timestamps and
   `CollegeHubWalArchiverDown` clears.

## Escalation

- > 12 h: page platform engineering — stale backups are the single biggest DR
  > risk; consider a temporary second store for the nightly run-all.
- Backup bucket deleted with no versioning: engage the storage provider
  (R2/GCS object versioning or S3 Object Lock usually allow undelete).

## Post-incident

- Add an alert on object-store latency/error rate (platform SLO).
- Verify `backup verify` on the oldest retained snapshot to prove the full
  retention window is still readable, not just the newest objects.
