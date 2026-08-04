/**
 * College Hub Backup Platform (MS-57) — Object store abstraction.
 * Provider-neutral contract satisfied by the S3-compatible client (MinIO, AWS
 * S3, Cloudflare R2, GCS interop) and the local filesystem implementation.
 * This mirrors the provider abstraction pattern of @college-hub/providers.
 */

export interface ObjectMetadata {
  key: string;
  sizeBytes: number;
  etag?: string;
  lastModified?: Date;
}

export interface ObjectStore {
  readonly type: 's3' | 'local';
  /** Upload a local file. Returns the stored object metadata (with etag when known). */
  putFile(key: string, filePath: string, contentType?: string): Promise<ObjectMetadata>;
  /** Upload an in-memory buffer (used for manifests and small artifacts). */
  putBuffer(key: string, content: Buffer, contentType?: string): Promise<ObjectMetadata>;
  /** Download an object to a local file. */
  downloadToFile(key: string, destPath: string): Promise<void>;
  /** Fetch an object into memory (used for manifests). */
  downloadBuffer(key: string): Promise<Buffer>;
  /** Read object metadata. Throws ObjectNotFoundError when absent. */
  head(key: string): Promise<ObjectMetadata>;
  delete(key: string): Promise<void>;
  /** List object keys under a prefix (paginated internally). */
  list(prefix: string): Promise<ObjectMetadata[]>;
}

export class ObjectNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`Object not found: ${key}`);
    this.name = 'ObjectNotFoundError';
  }
}

export function isObjectNotFound(err: unknown): boolean {
  return err instanceof ObjectNotFoundError;
}

/** Shared key layout for every backup artifact stored in the object store. */
export const BACKUP_KEY_PATHS = {
  postgresFull: 'postgres/full',
  postgresBase: 'postgres/base',
  postgresWal: 'postgres/wal',
  redisRdb: 'redis/rdb',
  minioMirror: 'minio/mirror'
} as const;

export function keyFor(prefix: string, path: string): string {
  return `${prefix.replace(/\/+$/, '')}/${path}`;
}

export function listObjects(store: ObjectStore, prefix: string): Promise<ObjectMetadata[]> {
  return store.list(prefix);
}
