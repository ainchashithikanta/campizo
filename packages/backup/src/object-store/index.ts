/**
 * College Hub Backup Platform (MS-57) — S3-compatible object store adapter.
 * Wraps the minimal S3Client behind the ObjectStore contract.
 */

import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { mkdirSync, rmSync, existsSync, statSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { S3Client, type S3ClientOptions } from './s3-client.js';
import { ObjectNotFoundError, type ObjectMetadata, type ObjectStore } from './types.js';

export interface S3ObjectStoreOptions extends S3ClientOptions {
  bucket: string;
}

export class S3ObjectStore implements ObjectStore {
  public readonly type = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3ObjectStoreOptions) {
    this.client = new S3Client(options);
    this.bucket = options.bucket;
  }

  public async putFile(
    key: string,
    filePath: string,
    contentType = 'application/octet-stream'
  ): Promise<ObjectMetadata> {
    return this.client.putFile(this.bucket, key, filePath, contentType);
  }

  public async putBuffer(
    key: string,
    content: Buffer,
    contentType = 'application/octet-stream'
  ): Promise<ObjectMetadata> {
    return this.client.putBuffer(this.bucket, key, content, contentType);
  }

  public async downloadToFile(key: string, destPath: string): Promise<void> {
    await this.client.downloadToFile(this.bucket, key, destPath);
  }

  public async downloadBuffer(key: string): Promise<Buffer> {
    return this.client.downloadBuffer(this.bucket, key);
  }

  public async head(key: string): Promise<ObjectMetadata> {
    return this.client.head(this.bucket, key);
  }

  public async delete(key: string): Promise<void> {
    await this.client.delete(this.bucket, key);
  }

  public async list(prefix: string): Promise<ObjectMetadata[]> {
    const keys = await this.client.listAll(this.bucket, prefix);
    return keys.map((key) => ({ key, sizeBytes: 0 }));
  }
}

/**
 * Local filesystem implementation of the ObjectStore contract. Used for fully
 * offline development environments (BACKUP_PROVIDER=local). Mirrors the same
 * key layout so switching providers is a configuration change only.
 */
export class LocalObjectStore implements ObjectStore {
  public readonly type = 'local' as const;
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private pathFor(key: string): string {
    if (key.includes('..')) {
      throw new Error(`Refusing to resolve object key containing '..': ${key}`);
    }
    return join(this.baseDir, key);
  }

  private ensureDir(key: string): void {
    mkdirSync(dirname(this.pathFor(key)), { recursive: true });
  }

  public async putFile(key: string, filePath: string): Promise<ObjectMetadata> {
    this.ensureDir(key);
    const dest = this.pathFor(key);
    writeFileSync(dest, readFileSync(filePath));
    return { key, sizeBytes: statSync(dest).size };
  }

  public async putBuffer(key: string, content: Buffer): Promise<ObjectMetadata> {
    this.ensureDir(key);
    const dest = this.pathFor(key);
    writeFileSync(dest, content);
    return { key, sizeBytes: content.length };
  }

  public async downloadToFile(key: string, destPath: string): Promise<void> {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, readFileSync(this.pathFor(key)));
  }

  public async downloadBuffer(key: string): Promise<Buffer> {
    return readFileSync(this.pathFor(key));
  }

  public async head(key: string): Promise<ObjectMetadata> {
    const full = this.pathFor(key);
    if (!existsSync(full)) {
      throw new ObjectNotFoundError(key);
    }
    return { key, sizeBytes: statSync(full).size };
  }

  public async delete(key: string): Promise<void> {
    const full = this.pathFor(key);
    if (existsSync(full)) {
      rmSync(full, { force: true });
    }
  }

  public async list(prefix: string): Promise<ObjectMetadata[]> {
    const base = this.pathFor(prefix);
    const results: ObjectMetadata[] = [];
    const walk = (dir: string, relative: string): void => {
      for (const entry of readdirSyncSafe(dir)) {
        const full = join(dir, entry);
        const rel = relative ? `${relative}/${entry}` : entry;
        if (statSync(full).isDirectory()) {
          walk(full, rel);
        } else {
          results.push({ key: `${prefix.replace(/\/+$/, '')}/${rel}`, sizeBytes: statSync(full).size });
        }
      }
    };
    if (existsSync(base)) {
      walk(base, '');
    }
    return results;
  }
}

function readdirSyncSafe(dir: string): string[] {
  return readdirSync(dir);
}

/** Create a temp working directory for backup/restore operations. */
export function createTempDir(prefix = 'collegehub-backup'): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}
