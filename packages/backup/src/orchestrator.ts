/**
 * College Hub Backup Platform (MS-57) — backup orchestrator.
 * Runs the complete scheduled backup: PostgreSQL snapshot (logical or base),
 * Redis RDB snapshot, MinIO media mirror, verification and retention cleanup.
 * Emits metrics and a structured summary for operators.
 */

import { logger } from '@college-hub/logger';
import { observability } from '@college-hub/observability';
import { createBackupMetrics, type BackupMetrics } from './metrics.js';
import type { ObjectStore } from './object-store/types.js';
import { S3ObjectStore, LocalObjectStore } from './object-store/index.js';
import { PostgresBackupService } from './services/postgres-backup.js';
import { RedisBackupService } from './services/redis-backup.js';
import { MinioMirrorService } from './services/minio-backup.js';
import { RetentionService, type RetentionPolicy } from './retention.js';
import type { BackupEnv } from './config.js';

export interface OrchestratorDependencies {
  postgres: PostgresBackupService;
  redis?: RedisBackupService;
  minio?: MinioMirrorService;
  retention?: RetentionService;
}

export interface OrchestratorOptions {
  snapshotType: 'logical' | 'physical';
  verifyAfterCreate: boolean;
  retention?: RetentionPolicy;
  env?: BackupEnv;
}

export interface OrchestratorReport {
  postgres: { snapshotId: string; checksum: string } | undefined;
  redis: { snapshotId: string } | undefined;
  minio: { mirrorId: string; objectCount: number; failures: number } | undefined;
  verification: Array<{ kind: string; ok: boolean; details: string[] }>;
  retention: { deletedObjects: string[] } | undefined;
}

export class BackupOrchestrator {
  private readonly dependencies: OrchestratorDependencies;
  private readonly options: OrchestratorOptions;
  private readonly metrics: BackupMetrics;

  constructor(dependencies: OrchestratorDependencies, options: OrchestratorOptions) {
    this.dependencies = dependencies;
    this.options = options;
    this.metrics = createBackupMetrics(observability.registry);
  }

  public async runAll(): Promise<OrchestratorReport> {
    const report: OrchestratorReport = {
      postgres: undefined,
      redis: undefined,
      minio: undefined,
      verification: [],
      retention: undefined
    };

    const started = Date.now();
    try {
      const snapshot =
        this.options.snapshotType === 'physical'
          ? await this.dependencies.postgres.createBaseSnapshot()
          : await this.dependencies.postgres.createLogicalSnapshot();
      report.postgres = { snapshotId: snapshot.manifest.id, checksum: snapshot.checksumSha256 };
      this.metrics.jobsTotal.labels('postgres', 'success').inc();
      this.metrics.lastSuccessTimestamp.labels('postgres').set(Date.now() / 1000);
      this.metrics.bytesTotal.labels('postgres').inc(snapshot.manifest.sizeBytes);

      if (this.options.verifyAfterCreate) {
        const verification = await this.dependencies.postgres.verifySnapshot(
          snapshot.manifest.id,
          this.options.snapshotType === 'physical' ? 'base' : 'logical'
        );
        report.verification.push({ kind: 'postgres', ok: verification.ok, details: verification.details });
      }

      if (this.dependencies.redis !== undefined) {
        const redisSnapshot = await this.dependencies.redis.createRdbSnapshot();
        report.redis = { snapshotId: redisSnapshot.id };
        this.metrics.jobsTotal.labels('redis', 'success').inc();
        this.metrics.lastSuccessTimestamp.labels('redis').set(Date.now() / 1000);
        this.metrics.bytesTotal.labels('redis').inc(redisSnapshot.sizeBytes);
      }

      if (this.dependencies.minio !== undefined) {
        const mirror = await this.dependencies.minio.mirror();
        report.minio = { mirrorId: mirror.id, objectCount: mirror.objectCount, failures: mirror.failures.length };
        this.metrics.jobsTotal.labels('minio', mirror.failures.length === 0 ? 'success' : 'partial').inc();
        this.metrics.lastSuccessTimestamp.labels('minio').set(Date.now() / 1000);
        this.metrics.bytesTotal.labels('minio').inc(mirror.bytesCopied);
        if (mirror.failures.length > 0) {
          for (const failure of mirror.failures) {
            logger.warn({ failure }, 'MinIO mirror object failure');
          }
        }
      }

      if (this.dependencies.retention !== undefined && this.options.retention !== undefined) {
        const retentionReport = await this.dependencies.retention.apply(this.options.retention);
        report.retention = { deletedObjects: retentionReport.deletedObjects };
      }
    } catch (err) {
      this.metrics.jobsTotal.labels('postgres', 'failure').inc();
      logger.error({ err }, 'Backup orchestrator failed');
      throw err;
    } finally {
      this.metrics.durationSeconds.labels('orchestrator').observe((Date.now() - started) / 1000);
    }

    logger.info({ report }, 'Backup orchestrator run-all completed');
    return report;
  }
}

export function createObjectStore(env: BackupEnv): ObjectStore {
  if (env.BACKUP_PROVIDER === 'local') {
    return new LocalObjectStore(env.BACKUP_LOCAL_DIR);
  }
  return new S3ObjectStore({
    endpoint: env.BACKUP_S3_ENDPOINT,
    region: env.BACKUP_S3_REGION,
    accessKeyId: env.BACKUP_S3_ACCESS_KEY_ID,
    secretAccessKey: env.BACKUP_S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.BACKUP_S3_FORCE_PATH_STYLE,
    bucket: env.BACKUP_S3_BUCKET
  });
}
