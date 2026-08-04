#!/usr/bin/env node
/**
 * College Hub Backup & Disaster Recovery CLI (MS-57).
 *
 * Commands (all idempotent unless noted):
 *   run-all                        Full scheduled backup: postgres + redis + minio mirror + verify + cleanup
 *   create-postgres                Create a PostgreSQL snapshot (--type logical|physical, default logical)
 *   create-redis                   Create a Redis RDB snapshot
 *   mirror-minio                   Mirror the media bucket into the backup bucket
 *   verify                         Verify the latest (or --id) snapshot integrity
 *   restore-postgres               Restore a logical snapshot (--target <url> [--id <id>])
 *   restore-redis                  Download an RDB snapshot (--id <id> --output <file>)
 *   restore-pitr                   Prepare a PITR data directory (--base-id <id> [--target-time <iso>] --data-dir <dir>)
 *   archive-wal                    Upload a WAL segment (--segment-file <path>) — used by archive_command
 *   fetch-wal                      Download a WAL segment (--segment <name> --dest <path>) — used by restore_command
 *   wal-forward                    Watch a directory and upload new WAL segments (--dir <path> [--metrics-port <n>])
 *   list                           List available backups (--kind postgres|redis|minio, default postgres)
 *   cleanup                        Enforce the retention policy
 *
 * Exit codes: 0 success, 1 failure.
 */

import { existsSync, readdirSync, rmSync, watch, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { logger } from '@college-hub/logger';
import { resolveBackupEnv, type BackupEnv } from './config.js';
import { createObjectStore } from './orchestrator.js';
import { PostgresBackupService } from './services/postgres-backup.js';
import { RedisBackupService } from './services/redis-backup.js';
import { MinioMirrorService } from './services/minio-backup.js';
import { RetentionService } from './retention.js';
import { BackupOrchestrator } from './orchestrator.js';
import { observability } from '@college-hub/observability';
import { createBackupMetrics } from './metrics.js';

function usage(): string {
  return [
    'Usage: backup <command> [options]',
    '',
    'Commands:',
    '  run-all',
    '  create-postgres [--type logical|physical]',
    '  create-redis',
    '  mirror-minio',
    '  verify [--kind postgres|redis|minio] [--id <id>]',
    '  restore-postgres --target <connection-url> [--id <id>]',
    '  restore-redis --id <id> --output <file>',
    '  restore-pitr --base-id <id> [--target-time <iso>] --data-dir <dir>',
    '  archive-wal --segment-file <path>',
    '  fetch-wal --segment <name> --dest <path>',
    '  wal-forward --dir <path> [--metrics-port <n>]',
    '  list [--kind postgres|redis|minio]',
    '  cleanup',
    '  help'
  ].join('\n');
}

function parseFlags(args: string[]): { flags: Record<string, string | undefined>; positional: string[] } {
  const flags: Record<string, string | undefined> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const value = args[i + 1];
      if (value !== undefined && !value.startsWith('--')) {
        flags[name] = value;
        i += 1;
      } else {
        flags[name] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function requireFlag(flags: Record<string, string | undefined>, name: string): string {
  const value = flags[name];
  if (value === undefined || value === 'true') {
    throw new Error(`Missing required flag --${name}`);
  }
  return value;
}

function buildServices(env: BackupEnv): {
  postgres: PostgresBackupService;
  redis: RedisBackupService;
  minio: MinioMirrorService;
  retention: RetentionService;
} {
  const objectStore = createObjectStore(env);
  if (env.BACKUP_POSTGRES_URL === undefined || env.BACKUP_POSTGRES_URL.length === 0) {
    throw new Error('BACKUP_POSTGRES_URL is required (or DATABASE_URL)');
  }
  const postgres = new PostgresBackupService({
    objectStore,
    prefix: env.BACKUP_PREFIX,
    connectionUrl: env.BACKUP_POSTGRES_URL,
    pgBinPrefix: env.BACKUP_PG_BIN_PREFIX,
    tmpDir: env.BACKUP_TMP_DIR
  });
  const redisUrl = env.BACKUP_REDIS_URL ?? 'redis://localhost:6379';
  const redis = new RedisBackupService({
    objectStore,
    prefix: env.BACKUP_PREFIX,
    redisUrl,
    redisBinPrefix: env.BACKUP_REDIS_BIN_PREFIX,
    tmpDir: env.BACKUP_TMP_DIR
  });
  const sourceStore =
    env.BACKUP_S3_ENDPOINT.length > 0
      ? createObjectStore({ ...env, BACKUP_S3_BUCKET: env.BACKUP_MINIO_SOURCE_BUCKET })
      : objectStore;
  const minio = new MinioMirrorService({
    sourceStore,
    targetStore: objectStore,
    prefix: env.BACKUP_PREFIX,
    sourcePrefix: '',
    tmpDir: env.BACKUP_TMP_DIR
  });
  const retention = new RetentionService(objectStore, env.BACKUP_PREFIX);
  return { postgres, redis, minio, retention };
}

async function runAll(env: BackupEnv): Promise<number> {
  const { postgres, redis, minio, retention } = buildServices(env);
  const orchestrator = new BackupOrchestrator(
    { postgres, redis, minio, retention },
    {
      snapshotType: env.BACKUP_PROVIDER === 'local' ? 'logical' : 'logical',
      verifyAfterCreate: env.BACKUP_VERIFY_AFTER_CREATE,
      retention: {
        fullBackups: env.BACKUP_RETENTION_FULL_BACKUPS,
        walHours: env.BACKUP_RETENTION_WAL_HOURS,
        redisSnapshots: env.BACKUP_RETENTION_REDIS_SNAPSHOTS,
        minioMirrors: env.BACKUP_RETENTION_MINIO_MIRRORS
      }
    }
  );
  const report = await orchestrator.runAll();
  logger.info({ report }, 'Backup run-all finished');
  return 0;
}

async function runWalForward(env: BackupEnv, dir: string, metricsPort: number | undefined): Promise<number> {
  if (!existsSync(dir)) {
    throw new Error(`WAL forward directory does not exist: ${dir}`);
  }
  const { postgres } = buildServices(env);
  const metrics = createBackupMetrics(observability.registry);

  if (metricsPort !== undefined) {
    const server = createServer(async (_req, res) => {
      res.setHeader('content-type', observability.registry.contentType);
      res.end(await observability.registry.metrics());
    });
    server.listen(metricsPort, '0.0.0.0');
    logger.info({ port: metricsPort }, 'WAL forwarder metrics endpoint listening');
  }

  const inFlight = new Set<string>();
  const failed = new Map<string, number>();

  const uploadFile = async (file: string): Promise<void> => {
    const fullPath = resolve(dir, file);
    if (inFlight.has(file)) {
      return;
    }
    inFlight.add(file);
    try {
      if (!existsSync(fullPath)) {
        return;
      }
      await postgres.archiveWal(fullPath, file);
      rmSync(fullPath, { force: true });
      failed.delete(file);
      metrics.jobsTotal.labels('wal', 'success').inc();
      logger.debug({ segment: file }, 'WAL segment archived and removed');
    } catch (err) {
      const attempts = failed.get(file) ?? 0;
      failed.set(file, attempts + 1);
      metrics.jobsTotal.labels('wal', 'failure').inc();
      logger.error({ err, segment: file, attempts: attempts + 1 }, 'WAL segment upload failed; will retry');
    } finally {
      inFlight.delete(file);
    }
  };

  const scan = async (): Promise<void> => {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (inFlight.has(entry)) {
        continue;
      }
      const stat = statSync(resolve(dir, entry));
      if (!stat.isFile()) {
        continue;
      }
      void uploadFile(entry);
    }
  };

  watch(dir, async (_eventType, filename) => {
    if (filename !== null && filename !== undefined) {
      void uploadFile(String(filename));
    }
  });
  logger.info({ dir }, 'WAL forwarder watching for archived segments');
  setInterval(() => {
    void scan();
  }, 15_000);
  void scan();
  await sleep(Number.MAX_SAFE_INTEGER);
  return 0;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);
  if (command === undefined || command === 'help' || command === '--help') {
    console.log(usage());
    return 0;
  }
  const { flags } = parseFlags(rest);
  const env = resolveBackupEnv();
  observability.configure({ serviceName: 'college-hub-backup', environment: process.env.NODE_ENV ?? 'production' });

  switch (command) {
    case 'run-all':
      return runAll(env);
    case 'create-postgres': {
      const { postgres } = buildServices(env);
      const type = flags['type'] ?? 'logical';
      const result = type === 'physical' ? await postgres.createBaseSnapshot() : await postgres.createLogicalSnapshot();
      console.log(`Created ${type} snapshot: ${result.manifest.id} (sha256 ${result.checksumSha256})`);
      return 0;
    }
    case 'create-redis': {
      const { redis } = buildServices(env);
      const manifest = await redis.createRdbSnapshot();
      console.log(`Created Redis RDB snapshot: ${manifest.id}`);
      return 0;
    }
    case 'mirror-minio': {
      const { minio } = buildServices(env);
      const result = await minio.mirror();
      console.log(
        `MinIO mirror ${result.id}: ${result.objectCount} objects, ${result.bytesCopied} bytes, ${result.failures.length} failures`
      );
      return result.failures.length === 0 ? 0 : 1;
    }
    case 'verify': {
      const kind = flags['kind'] ?? 'postgres';
      const { postgres, redis, minio } = buildServices(env);
      if (kind === 'redis') {
        const snapshots = await redis.listSnapshots();
        const id = flags['id'] ?? snapshots[0]?.id;
        if (id === undefined) {
          throw new Error('No Redis snapshots available to verify');
        }
        const result = await redis.verifySnapshot(id);
        console.log(`Redis snapshot ${id}: ${result.ok ? 'OK' : 'FAILED'} — ${result.details.join('; ')}`);
        return result.ok ? 0 : 1;
      }
      if (kind === 'minio') {
        const mirrors = await minio.listMirrors();
        const id = flags['id'] ?? mirrors[0];
        if (id === undefined) {
          throw new Error('No MinIO mirrors available to verify');
        }
        const result = await minio.verifyMirror(id);
        console.log(`MinIO mirror ${id}: ${result.ok ? 'OK' : 'FAILED'} — ${result.details.join('; ')}`);
        return result.ok ? 0 : 1;
      }
      const snapshots = await postgres.listSnapshots();
      const id = flags['id'] ?? snapshots[0]?.id;
      if (id === undefined) {
        throw new Error('No PostgreSQL snapshots available to verify');
      }
      const result = await postgres.verifySnapshot(id, 'logical');
      console.log(`PostgreSQL snapshot ${id}: ${result.ok ? 'OK' : 'FAILED'} — ${result.details.join('; ')}`);
      return result.ok ? 0 : 1;
    }
    case 'restore-postgres': {
      const target = requireFlag(flags, 'target');
      const { postgres } = buildServices(env);
      const snapshots = await postgres.listSnapshots();
      const id = flags['id'] ?? snapshots[0]?.id;
      if (id === undefined) {
        throw new Error('No PostgreSQL snapshots available to restore');
      }
      await postgres.restoreLogicalSnapshot(id, target);
      console.log(`Restored PostgreSQL snapshot ${id} into ${target.split('@').pop() ?? target}`);
      return 0;
    }
    case 'restore-redis': {
      const id = requireFlag(flags, 'id');
      const output = requireFlag(flags, 'output');
      const { redis } = buildServices(env);
      const manifest = await redis.downloadSnapshot(id, output);
      console.log(
        `Redis RDB snapshot ${manifest.id} downloaded to ${output} (${manifest.sizeBytes} bytes). Stop Redis, replace dump.rdb, start Redis.`
      );
      return 0;
    }
    case 'restore-pitr': {
      const baseId = requireFlag(flags, 'base-id');
      const dataDir = requireFlag(flags, 'data-dir');
      const { postgres } = buildServices(env);
      await postgres.preparePitrRestore(baseId, flags['target-time'], dataDir, env.BACKUP_RESTORE_COMMAND);
      console.log(`PITR restore prepared: base ${baseId}, data dir ${dataDir}`);
      return 0;
    }
    case 'archive-wal': {
      const segmentFile = requireFlag(flags, 'segment-file');
      const { postgres } = buildServices(env);
      const object = await postgres.archiveWal(segmentFile);
      console.log(`Archived WAL segment -> ${object}`);
      return 0;
    }
    case 'fetch-wal': {
      const segment = requireFlag(flags, 'segment');
      const dest = requireFlag(flags, 'dest');
      const { postgres } = buildServices(env);
      await postgres.fetchWal(segment, dest);
      return 0;
    }
    case 'wal-forward': {
      const dir = requireFlag(flags, 'dir');
      const metricsPort = flags['metrics-port'] !== undefined ? Number(flags['metrics-port']) : undefined;
      return runWalForward(env, dir, metricsPort);
    }
    case 'list': {
      const kind = flags['kind'] ?? 'postgres';
      const { postgres, redis, minio } = buildServices(env);
      if (kind === 'redis') {
        const snapshots = await redis.listSnapshots();
        for (const snapshot of snapshots) {
          console.log(`${snapshot.id}  ${snapshot.type}  ${snapshot.sizeBytes} bytes`);
        }
        return 0;
      }
      if (kind === 'minio') {
        const mirrors = await minio.listMirrors();
        for (const mirror of mirrors) {
          console.log(mirror);
        }
        return 0;
      }
      const snapshots = await postgres.listSnapshots();
      for (const snapshot of snapshots) {
        console.log(
          `${snapshot.id}  ${snapshot.type}  ${snapshot.sizeBytes} bytes  sha256 ${snapshot.checksum.value.slice(0, 16)}…`
        );
      }
      return 0;
    }
    case 'cleanup': {
      const { retention } = buildServices(env);
      const policy = {
        fullBackups: env.BACKUP_RETENTION_FULL_BACKUPS,
        walHours: env.BACKUP_RETENTION_WAL_HOURS,
        redisSnapshots: env.BACKUP_RETENTION_REDIS_SNAPSHOTS,
        minioMirrors: env.BACKUP_RETENTION_MINIO_MIRRORS
      };
      const report = await retention.apply(policy);
      console.log(`Retention cleanup: deleted ${report.deletedObjects.length} objects`);
      return 0;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error(usage());
      return 1;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    logger.error({ err }, 'Backup CLI failed');
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
