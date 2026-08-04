/**
 * MS-57 — Tests for backup configuration validation, retention policy
 * enforcement, PostgreSQL snapshot/restore flows and verification helpers.
 */

import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBackupEnv, resolveBackupEnv } from '../src/config.js';
import { LocalObjectStore } from '../src/object-store/index.js';
import { PostgresBackupService, parseConnectionUrl, type RunCommand } from '../src/services/postgres-backup.js';
import { RetentionService } from '../src/retention.js';
import { sha256File, checksumsMatch } from '../src/verify.js';
import { createBackupMetrics } from '../src/metrics.js';
import { MetricsRegistry } from '@college-hub/observability';

describe('backup configuration', () => {
  it('rejects an incomplete S3 configuration', () => {
    expect(() =>
      loadBackupEnv({
        BACKUP_ENABLED: 'true',
        BACKUP_PROVIDER: 's3',
        BACKUP_S3_ENDPOINT: '',
        BACKUP_S3_ACCESS_KEY_ID: '',
        BACKUP_S3_SECRET_ACCESS_KEY: ''
      })
    ).toThrow(/Invalid backup environment configuration/);
  });

  it('applies defaults for optional values', () => {
    const env = loadBackupEnv({
      BACKUP_ENABLED: 'true',
      BACKUP_S3_ENDPOINT: 'http://localhost:9000',
      BACKUP_S3_ACCESS_KEY_ID: 'k',
      BACKUP_S3_SECRET_ACCESS_KEY: 's'
    });
    expect(env.BACKUP_PROVIDER).toBe('s3');
    expect(env.BACKUP_S3_BUCKET).toBe('collegehub-backups');
    expect(env.BACKUP_RETENTION_FULL_BACKUPS).toBe(7);
    expect(env.BACKUP_RETENTION_WAL_HOURS).toBe(72);
    expect(env.BACKUP_VERIFY_AFTER_CREATE).toBe(true);
  });

  it('falls back to standard College Hub env vars', () => {
    const env = resolveBackupEnv({
      S3_ENDPOINT: 'http://minio:9000',
      S3_ACCESS_KEY_ID: 's3key',
      S3_SECRET_ACCESS_KEY: 's3secret',
      DATABASE_URL: 'postgresql://user:pass@db:5432/collegehub_db',
      REDIS_URL: 'redis://:pass@cache:6379'
    });
    expect(env.BACKUP_S3_ENDPOINT).toBe('http://minio:9000');
    expect(env.BACKUP_POSTGRES_URL).toContain('db:5432');
    expect(env.BACKUP_REDIS_URL).toContain('cache:6379');
  });

  it('supports the local filesystem provider', () => {
    const env = loadBackupEnv({
      BACKUP_PROVIDER: 'local',
      BACKUP_LOCAL_DIR: './local-backups',
      BACKUP_S3_ENDPOINT: 'http://localhost:9000',
      BACKUP_S3_ACCESS_KEY_ID: 'k',
      BACKUP_S3_SECRET_ACCESS_KEY: 's'
    });
    expect(env.BACKUP_PROVIDER).toBe('local');
  });
});

describe('connection URL parsing', () => {
  it('parses PostgreSQL URLs without exposing the password', () => {
    const parts = parseConnectionUrl('postgresql://alice:hunter2@pg.internal:5433/mydb?sslmode=require');
    expect(parts.host).toBe('pg.internal');
    expect(parts.port).toBe(5433);
    expect(parts.database).toBe('mydb');
    expect(parts.user).toBe('alice');
    expect(parts.password).toBe('hunter2');
  });

  it('uses the user as database name when the path is empty', () => {
    const parts = parseConnectionUrl('postgresql://bob@localhost');
    expect(parts.database).toBe('bob');
  });
});

describe('PostgresBackupService', () => {
  it('creates a logical snapshot, uploads it and writes a manifest', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pg-backup-'));
    const store = new LocalObjectStore(join(dir, 'store'));
    const commands: Array<{ binary: string; args: string[] }> = [];
    const runCommand: RunCommand = async (binary, args) => {
      commands.push({ binary, args });
      if (binary === 'pg_dump') {
        const fileArg = args.find((a) => a.startsWith('--file='));
        if (fileArg !== undefined) {
          writeFileSync(fileArg.replace('--file=', ''), 'DUMP-CONTENT');
        }
      }
      return { stdout: '', stderr: '' };
    };
    const service = new PostgresBackupService({
      objectStore: store,
      prefix: 'test',
      connectionUrl: 'postgresql://u:p@db:5432/collegehub_db',
      runCommand,
      tmpDir: dir
    });
    const result = await service.createLogicalSnapshot();
    expect(result.manifest.type).toBe('postgres-logical');
    expect(result.checksumSha256).toHaveLength(64);
    const manifest = JSON.parse(
      (await store.downloadBuffer('test/postgres/full/' + result.manifest.id + '/manifest.json')).toString('utf8')
    );
    expect(manifest.object).toBe(result.manifest.object);
    expect(manifest.checksum.value).toBe(result.checksumSha256);
    const pgDump = commands.find((c) => c.binary === 'pg_dump');
    expect(pgDump?.args.join(' ')).toContain('--no-owner');
    expect(pgDump?.args.join(' ')).toContain('--format=custom');
    expect(pgDump?.args.join(' ')).toContain('collegehub_db');
    expect(pgDump?.args.join(' ')).not.toContain('hunter2');
    rmSync(dir, { recursive: true, force: true });
  });

  it('verifies a snapshot by checksum and archive listing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pg-verify-'));
    const store = new LocalObjectStore(join(dir, 'store'));
    const runCommand: RunCommand = async (binary, args) => {
      if (binary === 'pg_dump') {
        const fileArg = args.find((a) => a.startsWith('--file='));
        if (fileArg !== undefined) {
          writeFileSync(fileArg.replace('--file=', ''), 'ARCHIVE-DATA');
        }
      }
      return { stdout: '', stderr: '' };
    };
    const service = new PostgresBackupService({
      objectStore: store,
      prefix: 'test',
      connectionUrl: 'postgresql://u:p@db:5432/collegehub_db',
      runCommand,
      tmpDir: dir
    });
    const created = await service.createLogicalSnapshot();
    const verify = await service.verifySnapshot(created.manifest.id, 'logical');
    expect(verify.ok).toBe(true);
    expect(verify.details.some((d) => d.includes('checksum: OK'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('restores a snapshot into a target database', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pg-restore-'));
    const store = new LocalObjectStore(join(dir, 'store'));
    const restored: Array<{ binary: string; args: string[] }> = [];
    const runCommand: RunCommand = async (binary, args) => {
      if (binary === 'pg_dump') {
        const fileArg = args.find((a) => a.startsWith('--file='));
        if (fileArg !== undefined) {
          writeFileSync(fileArg.replace('--file=', ''), 'DUMP-CONTENT');
        }
      }
      if (binary === 'pg_restore') {
        restored.push({ binary, args });
      }
      return { stdout: '', stderr: '' };
    };
    const service = new PostgresBackupService({
      objectStore: store,
      prefix: 'test',
      connectionUrl: 'postgresql://u:p@db:5432/collegehub_db',
      runCommand,
      tmpDir: dir
    });
    const created = await service.createLogicalSnapshot();
    await service.restoreLogicalSnapshot(created.manifest.id, 'postgresql://target:t@target-db:5432/restored_db');
    expect(restored).toHaveLength(1);
    expect(restored[0].args.join(' ')).toContain('--clean');
    expect(restored[0].args.join(' ')).toContain('--dbname=postgresql://target:t@target-db:5432/restored_db');
    expect(restored[0].args.join(' ')).not.toContain('hunter2');
    rmSync(dir, { recursive: true, force: true });
  });

  it('archives and fetches WAL segments', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pg-wal-'));
    const store = new LocalObjectStore(join(dir, 'store'));
    const service = new PostgresBackupService({
      objectStore: store,
      prefix: 'test',
      connectionUrl: 'postgresql://u:p@db:5432/collegehub_db',
      runCommand: async () => ({ stdout: '', stderr: '' }),
      tmpDir: dir
    });
    const wal = join(dir, '000000010000000000000001');
    writeFileSync(wal, 'WAL-SEGMENT');
    await service.archiveWal(wal);
    const fetched = join(dir, 'fetched');
    await service.fetchWal('000000010000000000000001', fetched);
    expect(await sha256File(fetched)).toBe(await sha256File(wal));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('RetentionService', () => {
  it('keeps the newest snapshots and deletes older artifacts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'retention-'));
    const store = new LocalObjectStore(join(dir, 'store'));
    for (let i = 1; i <= 4; i += 1) {
      await store.putBuffer(`test/postgres/full/2026-07-0${i}T00-00-00.000Z/collegehub.dump`, Buffer.from(`dump-${i}`));
      await store.putBuffer(`test/postgres/full/2026-07-0${i}T00-00-00.000Z/manifest.json`, Buffer.from('{}'));
      await store.putBuffer(`test/redis/rdb/2026-07-0${i}T00-00-00.000Z/dump.rdb`, Buffer.from(`rdb-${i}`));
    }
    const retention = new RetentionService(store, 'test');
    const report = await retention.apply({ fullBackups: 2, walHours: 72, redisSnapshots: 1, minioMirrors: 7 });
    expect(report.deletedObjects).toContain('test/postgres/full/2026-07-01T00-00-00.000Z/collegehub.dump');
    expect(report.deletedObjects).toContain('test/postgres/full/2026-07-01T00-00-00.000Z/manifest.json');
    expect(report.deletedObjects).not.toContain('test/postgres/full/2026-07-04T00-00-00.000Z/collegehub.dump');
    expect(report.deletedObjects).not.toContain('test/postgres/full/2026-07-03T00-00-00.000Z/collegehub.dump');
    expect(report.deletedObjects.filter((k) => k.includes('redis')).length).toBeGreaterThan(0);
    const remaining = await store.list('test/postgres/full/');
    expect(remaining).toHaveLength(4);
    const remainingIds = Array.from(new Set(remaining.map((o) => o.key.split('/')[3])));
    expect(remainingIds).toContain('2026-07-03T00-00-00.000Z');
    expect(remainingIds).toContain('2026-07-04T00-00-00.000Z');
    expect(remainingIds).not.toContain('2026-07-01T00-00-00.000Z');
    rmSync(dir, { recursive: true, force: true });
  });

  it('is idempotent', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'retention-idem-'));
    const store = new LocalObjectStore(join(dir, 'store'));
    await store.putBuffer('test/postgres/full/2026-07-01T00-00-00.000Z/collegehub.dump', Buffer.from('d'));
    const retention = new RetentionService(store, 'test');
    const first = await retention.apply({ fullBackups: 0, walHours: 72, redisSnapshots: 0, minioMirrors: 0 });
    const second = await retention.apply({ fullBackups: 0, walHours: 72, redisSnapshots: 0, minioMirrors: 0 });
    expect(first.deletedObjects).toHaveLength(1);
    expect(second.deletedObjects).toHaveLength(0);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('verification helpers', () => {
  it('computes file checksums and compares them', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'verify-'));
    const file = join(dir, 'a.txt');
    writeFileSync(file, 'content');
    const sha = await sha256File(file);
    expect(sha).toHaveLength(64);
    expect(checksumsMatch(sha, sha)).toBe(true);
    expect(checksumsMatch(sha, 'deadbeef')).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('Orchestrator metrics wiring', () => {
  it('registers backup metrics without duplicate meters', () => {
    const registry = new MetricsRegistry({ serviceName: 'test-backup' });
    const first = createBackupMetrics(registry);
    const second = createBackupMetrics(registry);
    expect(first.jobsTotal).toBe(second.jobsTotal);
    expect(first.durationSeconds).toBe(second.durationSeconds);
  });
});
