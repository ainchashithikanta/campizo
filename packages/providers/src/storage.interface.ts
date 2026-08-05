import type { BaseProvider } from './base.interface.js';

export interface StorageUploadResult {
  path: string;
  url: string;
  sizeBytes: number;
}

export interface StorageBucketOptions {
  bucket?: string;
}

export interface StorageUploadOptions extends StorageBucketOptions {
  upsert?: boolean;
  maxSizeBytes?: number;
}

export interface StorageSignedUrlOptions extends StorageBucketOptions {
  download?: boolean | string;
}

export interface StorageListOptions extends StorageBucketOptions {
  limit?: number;
  offset?: number;
  sortBy?: { column: string; order: 'asc' | 'desc' };
}

export interface StorageCopyOptions {
  fromBucket?: string;
  toBucket?: string;
}

export interface StorageListItem {
  name: string;
  id?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  lastAccessedAt?: string | null;
  metadata?: Record<string, unknown>;
  sizeBytes?: number;
}

export interface StorageProvider extends BaseProvider {
  readonly type: 'STORAGE';
  upload(
    path: string,
    content: Buffer | Uint8Array,
    mimeType: string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult>;
  download(path: string, options?: StorageBucketOptions): Promise<Buffer>;
  delete(path: string | string[], options?: StorageBucketOptions): Promise<boolean>;
  exists(path: string, options?: StorageBucketOptions): Promise<boolean>;
  getPublicUrl(path: string, options?: StorageBucketOptions): string;
  signedUrl(path: string, expiresInSeconds?: number, options?: StorageSignedUrlOptions): Promise<string>;
  list(prefix?: string, options?: StorageListOptions): Promise<StorageListItem[]>;
  copy(fromPath: string, toPath: string, options?: StorageCopyOptions): Promise<boolean>;
  move(fromPath: string, toPath: string, options?: StorageCopyOptions): Promise<boolean>;
}
