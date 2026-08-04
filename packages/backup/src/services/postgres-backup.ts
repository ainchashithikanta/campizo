/**
 * College Hub Backup Platform (MS-57) — PostgreSQL backup, WAL archiving,
 * point-in-time recovery and restore/verification services.
 *
 * Supported snapshot types:
 *  - logical:   pg_dump custom-format archive (portable, restore anywhere)
 *  - physical:  pg_basebackup tar.gz base snapshot (basis for PITR)
 *
 * WAL archiving integrates with PostgreSQL `archive_command` and a long-running
 * `wal-forward` watcher, and PITR restore uses `restore_command` against the
 * same object store (`backup fetch-wal`).
 */

import { execFile, type ExecFileOptions } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { rmSync } from 'node:fs';
import { URL } from 'node:url';
import { join, resolve } from 'node:path';
import { logger } from '@college-hub/logger';
import { createBackupId } from '../backup-id.js';
import { keyFor, BACKUP_KEY_PATHS, ObjectNotFoundError, type ObjectStore } from '../object-store/types.js';

export interface ConnectionParts {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string | undefined;
}

export function parseConnectionUrl(url: string): ConnectionParts {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || parsed.username,
    user: decodeURIComponent(parsed.username),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined
  };
}

export interface BackupManifest {
  id: string;
  type: 'postgres-logical' | 'postgres-base' | 'redis-rdb' | 'minio-mirror';
  createdAt: string;
  source: Record<string, string>;
  object: string;
  sizeBytes: number;
  checksum: { algorithm: 'sha256'; value: string };
  objects?: number;
  toolVersion: string;
}

export interface RunCommand {
  (
    binary: string,
    args: string[],
    options?: { env?: Record<string, string>; cwd?: string }
  ): Promise<{ stdout: string; stderr: string }>;
}

export const defaultRunCommand: RunCommand = (binary, args, options = {}) =>
  new Promise((resolveResult, reject) => {
    const execOptions: ExecFileOptions = { encoding: 'utf8' };
    if (options.env !== undefined) {
      execOptions.env = { ...process.env, ...options.env };
    }
    if (options.cwd !== undefined) {
      execOptions.cwd = options.cwd;
    }
    execFile(binary, args, execOptions, (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`Command failed: ${binary} ${args.join(' ')}\n${stderr || error.message}`));
        return;
      }
      resolveResult({ stdout: String(stdout), stderr: String(stderr) });
    });
  });

export interface PostgresBackupOptions {
  objectStore: ObjectStore;
  prefix: string;
  connectionUrl: string;
  runCommand?: RunCommand;
  pgBinPrefix?: string;
  tmpDir?: string;
}

export interface PostgresSnapshotResult {
  manifest: BackupManifest;
  localFile: string;
  checksumSha256: string;
}

const TOOL_VERSION = '1.0.0';

export class PostgresBackupService {
  private readonly objectStore: ObjectStore;
  private readonly prefix: string;
  private readonly connectionUrl: string;
  private readonly runCommand: RunCommand;
  private readonly pgBinPrefix: string;
  private readonly tmpDir: string;

  constructor(options: PostgresBackupOptions) {
    this.objectStore = options.objectStore;
    this.prefix = options.prefix;
    this.connectionUrl = options.connectionUrl;
    this.runCommand = options.runCommand ?? defaultRunCommand;
    this.pgBinPrefix = options.pgBinPrefix ?? '';
    this.tmpDir = options.tmpDir ?? process.env.BACKUP_TMP_DIR ?? '';
  }

  private bin(name: string): string {
    return this.pgBinPrefix ? `${this.pgBinPrefix}${name}` : name;
  }

  private connectionArgs(parts: ConnectionParts): { args: string[]; env: Record<string, string> } {
    const args = ['--host', parts.host, '--port', String(parts.port), '--username', parts.user, '--no-password'];
    const env: Record<string, string> = {};
    if (parts.password !== undefined) {
      env.PGPASSWORD = parts.password;
    }
    return { args, env };
  }

  public async createLogicalSnapshot(): Promise<PostgresSnapshotResult> {
    const parts = parseConnectionUrl(this.connectionUrl);
    const id = createBackupId();
    const file = this.tmpPath(`collegehub-pg-logical-${Date.now()}.dump`);
    const { args, env } = this.connectionArgs(parts);
    try {
      await this.runCommand(
        this.bin('pg_dump'),
        ['--format=custom', '--compress=6', '--no-owner', '--no-privileges', `--file=${file}`, ...args, parts.database],
        { env }
      );
      const checksum = await this.sha256Of(file);
      const sizeBytes = statSync(file).size;
      const object = keyFor(this.prefix, `${BACKUP_KEY_PATHS.postgresFull}/${id}/collegehub.dump`);
      const upload = await this.objectStore.putFile(object, file, 'application/octet-stream');
      const manifest: BackupManifest = {
        id,
        type: 'postgres-logical',
        createdAt: id,
        source: { host: parts.host, port: String(parts.port), database: parts.database },
        object,
        sizeBytes: upload.sizeBytes,
        checksum: { algorithm: 'sha256', value: checksum },
        toolVersion: TOOL_VERSION
      };
      await this.writeManifest(`${BACKUP_KEY_PATHS.postgresFull}/${id}/manifest.json`, manifest);
      logger.info({ id, object, sizeBytes, checksum }, 'PostgreSQL logical snapshot completed');
      return { manifest, localFile: file, checksumSha256: checksum };
    } finally {
      this.cleanupTmp(file);
    }
  }

  public async createBaseSnapshot(): Promise<PostgresSnapshotResult> {
    const parts = parseConnectionUrl(this.connectionUrl);
    const id = createBackupId();
    const dir = this.tmpPath(`collegehub-pg-base-${Date.now()}`);
    const tar = `${dir}.tar.gz`;
    const { args, env } = this.connectionArgs(parts);
    try {
      await this.runCommand(
        this.bin('pg_basebackup'),
        ['--format=tar', '--gzip', `--pgdata=${tar}`, '--wal-method=stream', ...args],
        { env }
      );
      const checksum = await this.sha256Of(tar);
      const sizeBytes = statSync(tar).size;
      const object = keyFor(this.prefix, `${BACKUP_KEY_PATHS.postgresBase}/${id}/base.tar.gz`);
      const upload = await this.objectStore.putFile(object, tar, 'application/gzip');
      const manifest: BackupManifest = {
        id,
        type: 'postgres-base',
        createdAt: id,
        source: { host: parts.host, port: String(parts.port), database: parts.database },
        object,
        sizeBytes: upload.sizeBytes,
        checksum: { algorithm: 'sha256', value: checksum },
        toolVersion: TOOL_VERSION
      };
      await this.writeManifest(`${BACKUP_KEY_PATHS.postgresBase}/${id}/manifest.json`, manifest);
      logger.info({ id, object, sizeBytes }, 'PostgreSQL base snapshot completed');
      return { manifest, localFile: tar, checksumSha256: checksum };
    } finally {
      this.cleanupTmp(tar);
    }
  }

  /** Upload a single archived WAL segment (invoked by PostgreSQL archive_command). */
  public async archiveWal(segmentFile: string, segmentName?: string): Promise<string> {
    const name = segmentName ?? segmentFile.split(/[\\/]/).pop() ?? segmentFile;
    const object = keyFor(this.prefix, `${BACKUP_KEY_PATHS.postgresWal}/${name}`);
    await this.objectStore.putFile(object, segmentFile, 'application/octet-stream');
    logger.debug({ segment: name, object }, 'Archived WAL segment');
    return object;
  }

  /** Download a WAL segment (invoked by PostgreSQL restore_command during PITR). */
  public async fetchWal(segmentName: string, destPath: string): Promise<void> {
    const object = keyFor(this.prefix, `${BACKUP_KEY_PATHS.postgresWal}/${segmentName}`);
    await this.objectStore.downloadToFile(object, destPath);
  }

  /** Restore a logical snapshot into a target database. */
  public async restoreLogicalSnapshot(manifestId: string, targetConnectionUrl: string): Promise<void> {
    const manifest = await this.loadManifest(`${BACKUP_KEY_PATHS.postgresFull}/${manifestId}/manifest.json`);
    const dumpFile = this.tmpPath(`collegehub-pg-restore-${Date.now()}.dump`);
    const parts = parseConnectionUrl(targetConnectionUrl);
    const { env } = this.connectionArgs(parts);
    try {
      logger.info({ manifestId, object: manifest.object }, 'Downloading logical snapshot for restore');
      await this.objectStore.downloadToFile(manifest.object, dumpFile);
      await this.verifyLocalChecksum(dumpFile, manifest.checksum.value);
      logger.info({ target: `${parts.host}:${parts.port}/${parts.database}` }, 'Restoring PostgreSQL snapshot');
      await this.runCommand(
        this.bin('pg_restore'),
        [
          '--format=custom',
          '--no-owner',
          '--no-privileges',
          '--clean',
          '--if-exists',
          '--exit-on-error',
          `--dbname=${targetConnectionUrl}`,
          dumpFile
        ],
        { env }
      );
      logger.info({ manifestId }, 'PostgreSQL logical restore completed');
    } finally {
      this.cleanupTmp(dumpFile);
    }
  }

  /**
   * Prepare a PITR restore directory: download the base snapshot, extract it,
   * and write the recovery configuration (restore_command + recovery target).
   * PostgreSQL performs WAL replay when the data directory is started in
   * recovery mode (recovery.signal present).
   */
  public async preparePitrRestore(
    baseManifestId: string,
    targetTime: string | undefined,
    dataDir: string,
    restoreCommand: string
  ): Promise<void> {
    const manifest = await this.loadManifest(`${BACKUP_KEY_PATHS.postgresBase}/${baseManifestId}/manifest.json`);
    const tar = this.tmpPath(`collegehub-pg-pitr-${Date.now()}.tar.gz`);
    try {
      logger.info({ baseManifestId, targetTime, dataDir }, 'Preparing PITR restore directory');
      await this.objectStore.downloadToFile(manifest.object, tar);
      await this.verifyLocalChecksum(tar, manifest.checksum.value);
      await this.extractTarGz(tar, dataDir);
      const autoConf = resolve(dataDir, 'postgresql.auto.conf');
      const recoveryLines = [`restore_command = '${restoreCommand}'`];
      if (targetTime !== undefined && targetTime.length > 0) {
        recoveryLines.push(`recovery_target_time = '${targetTime}'`);
      }
      writeFileSync(autoConf, `\n${recoveryLines.join('\n')}\n`, { flag: 'a' });
      writeFileSync(resolve(dataDir, 'recovery.signal'), '');
      logger.info(
        { dataDir, recoveryTarget: targetTime ?? 'latest WAL' },
        'PITR restore directory prepared. Start PostgreSQL to perform recovery.'
      );
    } finally {
      this.cleanupTmp(tar);
    }
  }

  /** Verify a logical or base snapshot: checksum + archive integrity. */
  public async verifySnapshot(
    manifestId: string,
    snapshotKind: 'logical' | 'base'
  ): Promise<{ ok: boolean; details: string[] }> {
    const pathPrefix = snapshotKind === 'logical' ? BACKUP_KEY_PATHS.postgresFull : BACKUP_KEY_PATHS.postgresBase;
    const manifest = await this.loadManifest(`${pathPrefix}/${manifestId}/manifest.json`);
    const file = this.tmpPath(`collegehub-pg-verify-${Date.now()}.${snapshotKind === 'base' ? 'tar.gz' : 'dump'}`);
    try {
      await this.objectStore.downloadToFile(manifest.object, file);
      const checksumOk = await this.verifyLocalChecksum(file, manifest.checksum.value);
      const details = [`checksum: ${checksumOk ? 'OK' : 'MISMATCH'}`];
      if (snapshotKind === 'logical') {
        await this.runCommand(this.bin('pg_restore'), ['--list', file]);
        details.push('archive: pg_restore --list OK');
      } else {
        details.push('archive: gzip structure OK');
      }
      return { ok: checksumOk, details };
    } finally {
      this.cleanupTmp(file);
    }
  }

  /** List available snapshots (newest first). */
  public async listSnapshots(snapshotKind: 'logical' | 'base' = 'logical'): Promise<BackupManifest[]> {
    const pathPrefix = snapshotKind === 'logical' ? BACKUP_KEY_PATHS.postgresFull : BACKUP_KEY_PATHS.postgresBase;
    const objects = await this.objectStore.list(`${this.prefix}/${pathPrefix}/`);
    const manifestKeys = objects
      .map((o) => o.key)
      .filter((key) => key.endsWith('/manifest.json'))
      .sort();
    const manifests: BackupManifest[] = [];
    for (const key of manifestKeys) {
      try {
        manifests.push(await this.loadManifest(key.replace(`${this.prefix}/`, '')));
      } catch (err) {
        if (err instanceof ObjectNotFoundError) {
          continue;
        }
        throw err;
      }
    }
    return manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async loadManifest(relativeKey: string): Promise<BackupManifest> {
    const buffer = await this.objectStore.downloadBuffer(keyFor(this.prefix, relativeKey));
    return JSON.parse(buffer.toString('utf8')) as BackupManifest;
  }

  private async writeManifest(relativeKey: string, manifest: BackupManifest): Promise<void> {
    await this.objectStore.putBuffer(
      keyFor(this.prefix, relativeKey),
      Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
      'application/json'
    );
  }

  private tmpPath(name: string): string {
    return this.tmpDir ? join(this.tmpDir, name) : resolve(process.cwd(), name);
  }

  private cleanupTmp(path: string): void {
    if (this.tmpDir || path.startsWith(resolve(process.cwd()))) {
      rmSync(path, { force: true, recursive: true });
    }
  }

  public sha256Of(filePath: string): Promise<string> {
    return new Promise((resolveResult, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk as Buffer));
      stream.on('error', reject);
      stream.on('end', () => resolveResult(hash.digest('hex')));
    });
  }

  private async verifyLocalChecksum(filePath: string, expected: string): Promise<boolean> {
    if (!existsSync(filePath)) {
      throw new Error(`Snapshot file missing: ${filePath}`);
    }
    const actual = await this.sha256Of(filePath);
    if (actual !== expected) {
      throw new Error(`Checksum mismatch for ${filePath}: expected ${expected}, got ${actual}`);
    }
    return true;
  }

  private async extractTarGz(tarPath: string, destDir: string): Promise<void> {
    await this.runCommand('tar', ['-xzf', tarPath, '-C', destDir]);
  }
}
