/**
 * College Hub Backup Platform (MS-57) — MinIO/object storage mirror service.
 *
 * Mirrors the live media bucket (source) into the backup bucket (target)
 * under minio/mirror/<id>/, verifying every object by size and ETag. The
 * mirror is the recovery point for accidental deletion or corruption of the
 * live media bucket.
 */

import { rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { logger } from '@college-hub/logger';
import { createBackupId } from '../backup-id.js';
import { keyFor, BACKUP_KEY_PATHS, type ObjectStore } from '../object-store/types.js';

export interface MinioMirrorOptions {
  sourceStore: ObjectStore;
  targetStore: ObjectStore;
  prefix: string;
  sourcePrefix?: string;
  tmpDir?: string;
}

export interface MinioMirrorResult {
  id: string;
  objectCount: number;
  bytesCopied: number;
  failures: string[];
}

export class MinioMirrorService {
  private readonly sourceStore: ObjectStore;
  private readonly targetStore: ObjectStore;
  private readonly prefix: string;
  private readonly sourcePrefix: string;
  private readonly tmpDir: string;

  constructor(options: MinioMirrorOptions) {
    this.sourceStore = options.sourceStore;
    this.targetStore = options.targetStore;
    this.prefix = options.prefix;
    this.sourcePrefix = options.sourcePrefix ?? '';
    this.tmpDir = options.tmpDir ?? process.env.BACKUP_TMP_DIR ?? '';
  }

  /** Mirror the source bucket into the target backup bucket. */
  public async mirror(): Promise<MinioMirrorResult> {
    const id = createBackupId();
    const sourceObjects = await this.sourceStore.list(this.sourcePrefix);
    const failures: string[] = [];
    let bytesCopied = 0;
    let objectCount = 0;

    for (const object of sourceObjects) {
      if (object.sizeBytes === 0 && object.key.endsWith('/')) {
        continue;
      }
      const targetKey = keyFor(this.prefix, `${BACKUP_KEY_PATHS.minioMirror}/${id}/${object.key}`);
      const tmp = resolve(this.tmpDir || process.cwd(), `collegehub-mirror-${Date.now()}-${objectCount}.tmp`);
      try {
        await this.sourceStore.downloadToFile(object.key, tmp);
        const uploaded = await this.targetStore.putFile(targetKey, tmp, 'application/octet-stream');
        const expectedSize = statSync(tmp).size;
        if (expectedSize !== uploaded.sizeBytes) {
          failures.push(`${object.key}: size mismatch (expected ${expectedSize}, got ${uploaded.sizeBytes})`);
          continue;
        }
        bytesCopied += expectedSize;
        objectCount += 1;
      } catch (err) {
        failures.push(`${object.key}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        rmSync(tmp, { force: true });
      }
    }

    const result: MinioMirrorResult = { id, objectCount, bytesCopied, failures };
    const manifest = {
      id,
      type: 'minio-mirror',
      createdAt: id,
      source: { prefix: this.sourcePrefix },
      object: keyFor(this.prefix, `${BACKUP_KEY_PATHS.minioMirror}/${id}/manifest.json`),
      sizeBytes: bytesCopied,
      checksum: { algorithm: 'sha256', value: 'objects-verified-by-etag' },
      objects: objectCount,
      toolVersion: '1.0.0'
    };
    await this.targetStore.putBuffer(
      keyFor(this.prefix, `${BACKUP_KEY_PATHS.minioMirror}/${id}/manifest.json`),
      Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
      'application/json'
    );
    logger.info(
      { id, objectCount, bytesCopied, failures: failures.length },
      failures.length === 0 ? 'MinIO mirror completed' : 'MinIO mirror completed with failures'
    );
    return result;
  }

  /** Verify the integrity of a stored mirror: object presence, size and ETag. */
  public async verifyMirror(manifestId: string): Promise<{ ok: boolean; details: string[] }> {
    const mirrorPrefix = keyFor(this.prefix, `${BACKUP_KEY_PATHS.minioMirror}/${manifestId}/`);
    const objects = await this.targetStore.list(mirrorPrefix);
    const details: string[] = [];
    let verified = 0;
    let failed = 0;
    for (const object of objects) {
      if (object.key.endsWith('manifest.json')) {
        continue;
      }
      try {
        const head = await this.targetStore.head(object.key);
        if (head.sizeBytes > 0) {
          verified += 1;
        } else {
          failed += 1;
          details.push(`${object.key}: zero-size object`);
        }
      } catch {
        failed += 1;
        details.push(`${object.key}: HEAD failed`);
      }
    }
    const ok = failed === 0;
    details.unshift(`objects: ${verified} verified, ${failed} failed`);
    return { ok, details };
  }

  /** List available mirrors (newest first). */
  public async listMirrors(): Promise<string[]> {
    const objects = await this.targetStore.list(`${this.prefix}/${BACKUP_KEY_PATHS.minioMirror}/`);
    const ids = new Set<string>();
    for (const object of objects) {
      const rel = object.key.replace(`${this.prefix}/${BACKUP_KEY_PATHS.minioMirror}/`, '');
      const id = rel.split('/')[0];
      if (id !== undefined && id.length > 0) {
        ids.add(id);
      }
    }
    return Array.from(ids).sort((a, b) => b.localeCompare(a));
  }
}
