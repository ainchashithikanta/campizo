#!/usr/bin/env bash
# =============================================================================
# College Hub - Automated Disaster Recovery Drill (MS-57)
#
# Simulates a complete PostgreSQL database loss and verifies that production
# data can be restored from the backup store within the RTO budget.
#
# Flow:
#   1. Ensure local compose infrastructure (primary PostgreSQL + MinIO) is up
#   2. Build the backup runner image (Dockerfile.backup, cached after first run)
#   3. Create a full logical snapshot (pg_dump -> object store) via the backup CLI
#   4. Verify the snapshot (checksum + archive integrity)
#   5. Spin up an isolated "restore target" PostgreSQL container
#   6. Restore the snapshot into the restore target
#   7. Compare normalized pg_dump checksums of primary vs restored data
#   8. Measure and report RTO; exit 0 on success / 1 on failure
#
# Idempotent: re-runnable at any time; cleans up its own resources.
#
# Requirements: docker, docker compose, bash 4+
# Usage: bash scripts/dr-restore-test.sh
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRIMARY_CONTAINER="collegehub_postgres"
RESTORE_CONTAINER="collegehub_dr_restore_target"
RESTORE_PORT=5544
DB_USER="${POSTGRES_USER:-collegehub_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-collegehub_password}"
DB_NAME="${POSTGRES_DB:-collegehub_db}"
IMAGE_NAME="collegehub-backup:local"
STARTED_AT="$(date +%s)"

info() { echo "[dr] $*"; }
fail() { echo "[dr] ERROR: $*" >&2; exit 1; }

cleanup() {
  info "Cleaning up drill resources..."
  docker rm -f "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# -----------------------------------------------------------------------------
# 1. Preconditions
# -----------------------------------------------------------------------------
command -v docker >/dev/null 2>&1 || fail "docker is required for the DR drill"
docker info >/dev/null 2>&1 || fail "docker daemon is not reachable"

info "Starting local compose infrastructure (primary PostgreSQL + MinIO)..."
docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d postgres minio >/dev/null 2>&1 || \
  fail "failed to start compose infrastructure"

for i in $(seq 1 30); do
  if docker exec "${PRIMARY_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${PRIMARY_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1 \
  || fail "primary PostgreSQL did not become ready"

# -----------------------------------------------------------------------------
# 2. Build the backup runner image (contains CLI + pg/redis client tooling)
# -----------------------------------------------------------------------------
if docker image inspect "${IMAGE_NAME}" >/dev/null 2>&1; then
  info "Backup runner image ${IMAGE_NAME} found (cached)"
else
  info "Building backup runner image ${IMAGE_NAME} (first run only, takes a few minutes)..."
  docker build -f "${ROOT_DIR}/Dockerfile.backup" -t "${IMAGE_NAME}" "${ROOT_DIR}" >/dev/null 2>&1 \
    || fail "failed to build the backup runner image"
fi

run_cli() {
  docker run --rm --network host \
    -e BACKUP_PROVIDER=s3 \
    -e BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-http://localhost:9000}" \
    -e BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-collegehub-backups}" \
    -e BACKUP_S3_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-minioadmin}" \
    -e BACKUP_S3_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-minioadmin}" \
    -e BACKUP_POSTGRES_URL="${BACKUP_POSTGRES_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}}" \
    -e PGPASSWORD="${DB_PASSWORD}" \
    -e BACKUP_PREFIX="${BACKUP_PREFIX:-dr-drill}" \
    "${IMAGE_NAME}" "$@"
}

# -----------------------------------------------------------------------------
# 3. Seed marker data for checksum comparison
# -----------------------------------------------------------------------------
info "Seeding marker data on the primary database..."
docker exec "${PRIMARY_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 >/dev/null \
  -c "CREATE TABLE IF NOT EXISTS dr_drill_marker (id serial PRIMARY KEY, payload text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());" \
  -c "INSERT INTO dr_drill_marker (payload) SELECT 'dr-marker-' || g FROM generate_series(1, 250) g ON CONFLICT DO NOTHING;" \
  || fail "failed to seed marker data"

# -----------------------------------------------------------------------------
# 4. Create + verify backup
# -----------------------------------------------------------------------------
info "Creating logical backup snapshot..."
run_cli create-postgres --type logical || fail "backup creation failed"

SNAPSHOT_ID="$(run_cli list --kind postgres | head -1)" || true
[ -n "${SNAPSHOT_ID:-}" ] || fail "could not determine snapshot id from backup listing"
info "Snapshot created: ${SNAPSHOT_ID}"

info "Verifying snapshot integrity (checksum + archive listing)..."
run_cli verify --kind postgres --id "${SNAPSHOT_ID}" || fail "backup verification failed"

# -----------------------------------------------------------------------------
# 5. Restore into an isolated target container
# -----------------------------------------------------------------------------
info "Starting isolated restore target on port ${RESTORE_PORT}..."
docker rm -f "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
docker run -d --name "${RESTORE_CONTAINER}" \
  -e POSTGRES_USER="${DB_USER}" \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -e POSTGRES_DB="${DB_NAME}" \
  -p "${RESTORE_PORT}:5432" \
  pgvector/pgvector:pg16 >/dev/null 2>&1 || fail "failed to start restore target container"

for i in $(seq 1 30); do
  if docker exec "${RESTORE_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${RESTORE_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1 \
  || fail "restore target did not become ready"

info "Restoring snapshot into restore target..."
run_cli restore-postgres \
  --target "postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${RESTORE_PORT}/${DB_NAME}" \
  --id "${SNAPSHOT_ID}" || fail "restore failed"

# -----------------------------------------------------------------------------
# 6. Checksum comparison (primary vs restored, normalized dumps)
# -----------------------------------------------------------------------------
info "Comparing normalized dumps between primary and restored databases..."
dump_checksums() {
  local host="$1"
  local port="$2"
  docker run --rm --network host --entrypoint sh -e PGPASSWORD="${DB_PASSWORD}" \
    "${IMAGE_NAME}" -c \
      "pg_dump -h '${host}' -p '${port}' -U '${DB_USER}' -d '${DB_NAME}' --no-owner --no-privileges --no-comments --schema-only | sha256sum && pg_dump -h '${host}' -p '${port}' -U '${DB_USER}' -d '${DB_NAME}' --no-owner --no-privileges --no-comments --data-only | sha256sum"
}

PRIMARY_SCHEMA_CHECKSUM="$(dump_checksums localhost 5432 | head -1 | cut -d' ' -f1)"
PRIMARY_DATA_CHECKSUM="$(dump_checksums localhost 5432 | tail -1 | cut -d' ' -f1)"
RESTORED_SCHEMA_CHECKSUM="$(dump_checksums localhost "${RESTORE_PORT}" | head -1 | cut -d' ' -f1)"
RESTORED_DATA_CHECKSUM="$(dump_checksums localhost "${RESTORE_PORT}" | tail -1 | cut -d' ' -f1)"

if [ "${PRIMARY_SCHEMA_CHECKSUM}" != "${RESTORED_SCHEMA_CHECKSUM}" ]; then
  fail "schema checksum mismatch: primary=${PRIMARY_SCHEMA_CHECKSUM} restored=${RESTORED_SCHEMA_CHECKSUM}"
fi
if [ "${PRIMARY_DATA_CHECKSUM}" != "${RESTORED_DATA_CHECKSUM}" ]; then
  fail "data checksum mismatch: primary=${PRIMARY_DATA_CHECKSUM} restored=${RESTORED_DATA_CHECKSUM}"
fi

RESTORED_ROWS="$(docker exec "${RESTORE_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT count(*) FROM dr_drill_marker;")"
[ "${RESTORED_ROWS}" = "250" ] || fail "restored marker rows mismatch: expected 250, got ${RESTORED_ROWS}"

# -----------------------------------------------------------------------------
# 7. Report
# -----------------------------------------------------------------------------
ELAPSED_SECONDS="$(( $(date +%s) - STARTED_AT ))"
info "Schema checksum: ${PRIMARY_SCHEMA_CHECKSUM}"
info "Data checksum:   ${PRIMARY_DATA_CHECKSUM}"
info "Marker rows:     250/250 verified on restored database"
info "RTO achieved:    ${ELAPSED_SECONDS}s (target: < 900s / 15 min)"
if [ "${ELAPSED_SECONDS}" -le 900 ]; then
  info "DR DRILL PASSED - data is recoverable within the RTO budget"
else
  fail "DR drill exceeded the 15 minute RTO budget (${ELAPSED_SECONDS}s)"
fi
