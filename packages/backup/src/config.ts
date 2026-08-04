/**
 * College Hub Backup & Disaster Recovery Platform (MS-57)
 * Strict Zod validation for the backup runtime environment. Follows the same
 * pattern as @college-hub/config: fail fast at boot with descriptive errors.
 */

import { z } from 'zod';

export const BACKUP_PROVIDERS = ['s3', 'local'] as const;
export type BackupProvider = (typeof BACKUP_PROVIDERS)[number];

export const POSTGRES_SNAPSHOT_TYPES = ['logical', 'physical'] as const;
export type PostgresSnapshotType = (typeof POSTGRES_SNAPSHOT_TYPES)[number];

export const backupEnvSchema = z
  .object({
    // Global toggles
    BACKUP_ENABLED: z.coerce.boolean().default(true),

    // Storage provider (s3 = any S3-compatible endpoint incl. MinIO, local = filesystem)
    BACKUP_PROVIDER: z.enum(BACKUP_PROVIDERS).default('s3'),
    BACKUP_PREFIX: z.string().default('collegehub'),
    BACKUP_TMP_DIR: z.string().default(''),

    // S3-compatible object store
    BACKUP_S3_ENDPOINT: z.string().url(),
    BACKUP_S3_REGION: z.string().default('us-east-1'),
    BACKUP_S3_BUCKET: z.string().default('collegehub-backups'),
    BACKUP_S3_ACCESS_KEY_ID: z.string(),
    BACKUP_S3_SECRET_ACCESS_KEY: z.string(),
    BACKUP_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

    // Local filesystem provider base directory (used when BACKUP_PROVIDER=local)
    BACKUP_LOCAL_DIR: z.string().default('./backups'),

    // PostgreSQL source / target
    BACKUP_POSTGRES_URL: z.string().optional(),

    // Redis source
    BACKUP_REDIS_URL: z.string().optional(),

    // PostgreSQL tooling (allows overriding binary names/paths, e.g. docker exec)
    BACKUP_PG_BIN_PREFIX: z.string().default(''),
    BACKUP_REDIS_BIN_PREFIX: z.string().default(''),

    // Restore command embedded in PITR recovery configuration
    BACKUP_RESTORE_COMMAND: z.string().default('restore_command'),

    // Retention policy
    BACKUP_RETENTION_FULL_BACKUPS: z.coerce.number().int().min(1).max(365).default(7),
    BACKUP_RETENTION_WAL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 90)
      .default(72),
    BACKUP_RETENTION_REDIS_SNAPSHOTS: z.coerce.number().int().min(1).max(365).default(3),
    BACKUP_RETENTION_MINIO_MIRRORS: z.coerce.number().int().min(1).max(365).default(7),

    // Verification
    BACKUP_VERIFY_AFTER_CREATE: z.coerce.boolean().default(true),

    // MinIO mirror source bucket (the live media bucket)
    BACKUP_MINIO_SOURCE_BUCKET: z.string().default('collegehub-media'),

    // Metrics (integrated with @college-hub/observability)
    METRICS_ENABLED: z.coerce.boolean().default(false)
  })
  .refine(
    (data) => {
      if (data.BACKUP_ENABLED && data.BACKUP_PROVIDER === 's3') {
        return (
          data.BACKUP_S3_ENDPOINT.length > 0 &&
          data.BACKUP_S3_ACCESS_KEY_ID.length > 0 &&
          data.BACKUP_S3_SECRET_ACCESS_KEY.length > 0
        );
      }
      return true;
    },
    {
      message:
        'S3 backup provider requires BACKUP_S3_ENDPOINT, BACKUP_S3_ACCESS_KEY_ID and BACKUP_S3_SECRET_ACCESS_KEY',
      path: ['BACKUP_S3_ENDPOINT']
    }
  );

export type BackupEnv = z.infer<typeof backupEnvSchema>;

export function loadBackupEnv(env: NodeJS.ProcessEnv = process.env): BackupEnv {
  const parsed = backupEnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid backup environment configuration: ${details}`);
  }
  return parsed.data;
}

/** Derive the S3 endpoint from standard College Hub env vars when BACKUP_S3_* is absent. */
export function resolveBackupEnv(env: NodeJS.ProcessEnv = process.env): BackupEnv {
  const merged: NodeJS.ProcessEnv = { ...env };
  if (merged.BACKUP_S3_ENDPOINT === undefined && merged.S3_ENDPOINT !== undefined) {
    merged.BACKUP_S3_ENDPOINT = merged.S3_ENDPOINT;
  }
  if (merged.BACKUP_S3_ACCESS_KEY_ID === undefined && merged.S3_ACCESS_KEY_ID !== undefined) {
    merged.BACKUP_S3_ACCESS_KEY_ID = merged.S3_ACCESS_KEY_ID;
  }
  if (merged.BACKUP_S3_SECRET_ACCESS_KEY === undefined && merged.S3_SECRET_ACCESS_KEY !== undefined) {
    merged.BACKUP_S3_SECRET_ACCESS_KEY = merged.S3_SECRET_ACCESS_KEY;
  }
  if (merged.BACKUP_POSTGRES_URL === undefined && merged.DATABASE_URL !== undefined) {
    merged.BACKUP_POSTGRES_URL = merged.DATABASE_URL;
  }
  if (merged.BACKUP_REDIS_URL === undefined && merged.REDIS_URL !== undefined) {
    merged.BACKUP_REDIS_URL = merged.REDIS_URL;
  }
  return loadBackupEnv(merged);
}
