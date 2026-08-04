# Runbook: PostgreSQL Point-in-Time Recovery (PITR)

- **ID**: `postgres-pitr-restore`
- **Severity**: CRITICAL
- **Trigger**: `CollegeHubBackupJobFailed` or `CollegeHubWalArchiverDown` fires,
  or an incident confirms partial data loss / corruption where a full-snapshot
  restore would lose too much data.

## Goal

Recover the database to a specific point in time using the WAL archive:
base snapshot + applied WAL segments, with **no data loss after the target
time** (RPO restored to minutes).

## Prerequisites

- Access to the backup object store (`BACKUP_S3_*` credentials).
- PostgreSQL 16 server tools (`pg_basebackup`/`pg_restore` are not needed for
  PITR; the data directory is booted with the same PostgreSQL 16 binary).
- A spare node/VM with storage >= 1.5× the base snapshot size.

## Steps

1. **Identify the restore target time** (e.g. the incident start minus
   one minute) and the newest base snapshot:

   ```bash
   backup list --kind postgres
   # note the newest "logical" snapshot id, e.g. 2026-08-04T02-00-00.000Z
   ```

2. **Stop all writes to the primary** (pause worker queues, set API to
   read-only, or cut DNS) so the target time remains stable.

3. **Provision a fresh data directory** on the spare node:

   ```bash
   initdb -D /var/lib/postgresql/restore-data -U postgres   # or use pg_createcluster
   ```

4. **Prepare the PITR restore** (writes `postgresql.auto.conf` + `recovery.signal`):

   ```bash
   export BACKUP_RESTORE_COMMAND='backup fetch-wal --segment %f --dest %p'
   backup restore-pitr \
     --base-id 2026-08-04T02-00-00.000Z \
     --target-time 2026-08-04T12:30:00Z \
     --data-dir /var/lib/postgresql/restore-data
   ```

5. **Boot PostgreSQL on the restore directory**:

   ```bash
   pg_ctl -D /var/lib/postgresql/restore-data start
   # PostgreSQL replays the base + WAL up to the target time, then stops in
   # recovery (or stays read-only until promotion, depending on configuration).
   ```

6. **Validate**:

   ```sql
   SELECT count(*) FROM dr_drill_marker;          -- spot-check known data
   SELECT max(created_at) FROM orders;            -- latest row <= target time
   ```

7. **Promote** (`pg_ctl promote`) once validated, then point traffic at the
   restored database. Keep the original primary untouched until sign-off.

## Escalation

- > 15 min: page platform engineering; engage the DBA on-call.
- Missing WAL gap: the last verified segment in the backup store bounds how
  far back the target time must move (`CollegeHubWalArchiverDown` alerts mean
  the archive may have gaps — see `backup-store-outage.md`).

## Post-incident

- Root-cause the WAL archiving failure that created the gap.
- Re-run `scripts/dr-restore-test.sh` to confirm the restore path still works.
- Update the target-time picker if operators misjudged the incident window.
