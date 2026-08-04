/**
 * @college-hub/backup — Backup & Disaster Recovery Platform (MS-57)
 * Provider-neutral backup engine for PostgreSQL (WAL archiving + PITR), Redis
 * (RDB snapshots), MinIO (bucket mirror) with retention, verification and
 * automated DR drill tooling. No commercial SaaS dependency: any S3-compatible
 * object store (MinIO, AWS S3, R2, GCS interop) or the local filesystem is
 * supported through the ObjectStore contract.
 */

export {
  backupEnvSchema,
  loadBackupEnv,
  resolveBackupEnv,
  BACKUP_PROVIDERS,
  POSTGRES_SNAPSHOT_TYPES,
  type BackupEnv,
  type BackupProvider,
  type PostgresSnapshotType
} from './config.js';
export {
  ObjectNotFoundError,
  isObjectNotFound,
  BACKUP_KEY_PATHS,
  keyFor,
  listObjects,
  type ObjectMetadata,
  type ObjectStore
} from './object-store/types.js';
export {
  S3Client,
  S3Error,
  computeFileSha256,
  type S3ClientOptions,
  type S3ErrorOptions
} from './object-store/s3-client.js';
export {
  S3ObjectStore,
  LocalObjectStore,
  createTempDir,
  cleanupTempDir,
  type S3ObjectStoreOptions
} from './object-store/index.js';
export {
  PostgresBackupService,
  parseConnectionUrl,
  defaultRunCommand,
  type BackupManifest,
  type ConnectionParts,
  type PostgresBackupOptions,
  type PostgresSnapshotResult,
  type RunCommand
} from './services/postgres-backup.js';
export { RedisBackupService, type RedisBackupOptions } from './services/redis-backup.js';
export { MinioMirrorService, type MinioMirrorOptions, type MinioMirrorResult } from './services/minio-backup.js';
export { RetentionService, defaultRetentionPolicy, type RetentionPolicy, type RetentionReport } from './retention.js';
export { createBackupMetrics, type BackupKind, type BackupMetrics } from './metrics.js';
export {
  BackupOrchestrator,
  createObjectStore,
  type OrchestratorDependencies,
  type OrchestratorOptions,
  type OrchestratorReport
} from './orchestrator.js';
export { sha256File, checksumOfBuffer, checksumsMatch, type ChecksumReport } from './verify.js';
