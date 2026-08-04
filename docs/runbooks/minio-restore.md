# Runbook: MinIO / Media Object Store Restore

- **ID**: `minio-restore`
- **Severity**: HIGH
- **Trigger**: Media bucket (`collegehub-media`) corrupted, volume lost, or
  objects deleted; user-facing uploads (profiles, resources, marketplace
  images) 404.

## Context

MinIO holds user-generated media. The nightly `mirror-minio` copies every
object into `minio/mirror/<id>/` inside the backup bucket (retention default:
7 mirrors). Mirrors are byte-identical copies with integrity verification
(`verifyMirror` re-downloads and hashes a sample).

## Steps

1. **Confirm scope**: compare bucket object counts with the last mirror's
   `objectsTotal` metric (`collegehub_backup_objects_total{type="minio"}`).

2. **List mirrors**:

   ```bash
   backup list --kind minio
   ```

3. **Verify the chosen mirror** before copying back:

   ```bash
   backup verify --kind minio --id 2026-08-04T04-00-00.000Z
   ```

4. **Restore objects**. Options:

   - Full mirror restore (stop writes first):

     ```bash
     # copy mirror prefix back into the media bucket with mc:
     mc cp --recursive \
       "backup/minio/mirror/2026-08-04T04-00-00.000Z/" \
       "media/collegehub-media/"
     ```

   - Selective restore (fewer objects): `mc cp` just the affected prefixes
     (e.g. `profiles/`, `resources/`).

5. **Validate**: spot-check URLs via the API (`getPublicUrl`), confirm object
   counts and a sample of SHA-256 sums against the mirror manifest.

6. **Re-enable writes** and confirm the next nightly mirror runs clean.

## Escalation

- Mirror verification fails (object mismatch): page platform engineering; the
  7-day retention gives 7 chances to find an intact mirror.
- Source bucket deletion was deliberate but unauthorized: restore from the
  newest mirror and enable object-lock/versioning on `collegehub-media` to
  make future deletions recoverable in-place.

## Post-incident

- Enable bucket versioning + lifecycle on the media bucket (belt-and-braces
  on top of the mirror).
- If media is irreplaceable, raise the mirror cadence (`backup.minio.schedule`)
  or run `backup mirror-minio` on-demand after large upload campaigns.
