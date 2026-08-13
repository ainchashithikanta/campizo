import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@college-hub/logger';
import type { ProviderHealth } from './base.interface.js';
import type {
  StorageProvider,
  StorageUploadResult,
  StorageBucketOptions,
  StorageUploadOptions,
  StorageSignedUrlOptions,
  StorageListOptions,
  StorageCopyOptions,
  StorageListItem
} from './storage.interface.js';

export interface SupabaseStorageProviderOptions {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseAnonKey?: string;
  priority?: number;
  buckets?: {
    avatars?: string;
    marketplace?: string;
    materials?: string;
    documents?: string;
    events?: string;
    misc?: string;
  };
  maxFileSizeBytes?: number;
}

export const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // PDF
  'application/pdf',
  // ZIP / Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-tar',
  'application/gzip',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  // Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown'
]);

export const PUBLIC_BUCKETS = new Set(['avatars', 'marketplace', 'events', 'materials']);
export const PRIVATE_BUCKETS = new Set(['documents', 'misc']);

export class SupabaseStorageProvider implements StorageProvider {
  public readonly name = 'supabase-storage';
  public readonly type = 'STORAGE' as const;
  public readonly version = '1.0.0';
  public readonly priority: number;

  private supabase: SupabaseClient;
  private defaultBucket: string;
  private maxFileSizeBytes: number;
  private bucketMap: Record<string, string>;

  constructor(options: SupabaseStorageProviderOptions = {}) {
    this.priority = options.priority ?? 1;
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? 10 * 1024 * 1024; // 10MB default limit

    const url = options.supabaseUrl || process.env.SUPABASE_URL || 'http://localhost:54321';
    const key =
      options.supabaseServiceRoleKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      options.supabaseAnonKey ||
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    this.bucketMap = {
      avatars: options.buckets?.avatars || process.env.SUPABASE_STORAGE_BUCKET_AVATARS || 'avatars',
      marketplace: options.buckets?.marketplace || process.env.SUPABASE_STORAGE_BUCKET_MARKETPLACE || 'marketplace',
      materials: options.buckets?.materials || process.env.SUPABASE_STORAGE_BUCKET_MATERIALS || 'materials',
      documents: options.buckets?.documents || process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS || 'documents',
      events: options.buckets?.events || process.env.SUPABASE_STORAGE_BUCKET_EVENTS || 'events',
      misc: options.buckets?.misc || process.env.SUPABASE_STORAGE_BUCKET_MISC || 'misc'
    };

    this.defaultBucket = this.bucketMap.misc || 'misc';
  }

  public async initialize(): Promise<void> {
    logger.info({ bucketMap: this.bucketMap }, 'SupabaseStorageProvider initialized');
  }

  public async healthCheck(): Promise<ProviderHealth> {
    try {
      const { data, error } = await this.supabase.storage.listBuckets();
      if (error) {
        return { healthy: false, message: error.message };
      }
      return { healthy: true, details: { bucketsCount: data?.length || 0 } };
    } catch (err) {
      return {
        healthy: false,
        message: err instanceof Error ? err.message : String(err)
      };
    }
  }

  public getCapabilities(): string[] {
    return [
      'upload',
      'download',
      'delete',
      'exists',
      'getPublicUrl',
      'signedUrl',
      'list',
      'copy',
      'move',
      'mimeValidation',
      'sizeLimitValidation',
      'privateBuckets',
      'publicBuckets'
    ];
  }

  private resolveBucket(bucketName?: string): string {
    if (!bucketName) return this.defaultBucket;
    return this.bucketMap[bucketName] || bucketName || this.defaultBucket;
  }

  public validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new Error(
        `Unsupported content type / MIME type: '${mimeType}'. Allowed types: images, pdf, zip, video, documents.`
      );
    }
  }

  public validateFileSize(sizeBytes: number, maxBytes?: number): void {
    const limit = maxBytes || this.maxFileSizeBytes;
    if (sizeBytes > limit) {
      throw new Error(`File size ${sizeBytes} bytes exceeds maximum allowed limit of ${limit} bytes.`);
    }
  }

  public async upload(
    path: string,
    content: Buffer | Uint8Array,
    mimeType: string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    this.validateMimeType(mimeType);
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
    this.validateFileSize(buf.length, options?.maxSizeBytes);

    const bucket = this.resolveBucket(options?.bucket);
    const upsert = options?.upsert ?? true;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, buf, { contentType: mimeType, upsert });

    if (error) {
      logger.error({ error, path, bucket }, 'Supabase Storage upload failed');
      throw new Error(`Supabase upload failed for '${path}': ${error.message}`);
    }

    const publicUrl = this.getPublicUrl(path, { bucket });

    return {
      path: data?.path || path,
      url: publicUrl,
      sizeBytes: buf.length
    };
  }

  public async download(path: string, options?: StorageBucketOptions): Promise<Buffer> {
    const bucket = this.resolveBucket(options?.bucket);
    const { data, error } = await this.supabase.storage.from(bucket).download(path);

    if (error || !data) {
      throw new Error(`Supabase download failed for '${path}': ${error?.message || 'File not found'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  public async delete(path: string | string[], options?: StorageBucketOptions): Promise<boolean> {
    const bucket = this.resolveBucket(options?.bucket);
    const paths = Array.isArray(path) ? path : [path];
    const { data, error } = await this.supabase.storage.from(bucket).remove(paths);

    if (error) {
      logger.error({ error, paths, bucket }, 'Supabase Storage delete failed');
      return false;
    }

    return (data && data.length > 0) ?? false;
  }

  public async exists(path: string, options?: StorageBucketOptions): Promise<boolean> {
    try {
      const bucket = this.resolveBucket(options?.bucket);
      const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      const fileName = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;

      const { data, error } = await this.supabase.storage.from(bucket).list(dirPath, { search: fileName });
      if (error || !data) return false;
      return data.some((item) => item.name === fileName);
    } catch {
      return false;
    }
  }

  public getPublicUrl(path: string, options?: StorageBucketOptions): string {
    const bucket = this.resolveBucket(options?.bucket);
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  public async signedUrl(path: string, expiresInSeconds = 3600, options?: StorageSignedUrlOptions): Promise<string> {
    const bucket = this.resolveBucket(options?.bucket);
    const signedOptions: { download?: string | boolean } = {};
    if (options?.download !== undefined) {
      signedOptions.download = options.download;
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds, Object.keys(signedOptions).length > 0 ? signedOptions : undefined);

    if (error || !data) {
      throw new Error(`Failed to generate signed URL for '${path}': ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }

  public async list(prefix = '', options?: StorageListOptions): Promise<StorageListItem[]> {
    const bucket = this.resolveBucket(options?.bucket);
    const listOpts: Record<string, unknown> = {};
    if (options?.limit !== undefined) listOpts.limit = options.limit;
    if (options?.offset !== undefined) listOpts.offset = options.offset;
    if (options?.sortBy !== undefined) listOpts.sortBy = options.sortBy;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(prefix, Object.keys(listOpts).length > 0 ? listOpts : undefined);

    if (error || !data) {
      throw new Error(`Failed to list objects in bucket '${bucket}': ${error?.message || 'Unknown error'}`);
    }

    return data.map((item) => {
      const res: StorageListItem = { name: item.name };
      if (item.id) res.id = item.id;
      if (item.updated_at) res.updatedAt = item.updated_at;
      if (item.created_at) res.createdAt = item.created_at;
      if (item.last_accessed_at) res.lastAccessedAt = item.last_accessed_at;
      if (item.metadata) {
        res.metadata = item.metadata as Record<string, unknown>;
        if (item.metadata.size !== undefined && item.metadata.size !== null) {
          res.sizeBytes = Number(item.metadata.size);
        }
      }
      return res;
    });
  }

  public async copy(fromPath: string, toPath: string, options?: StorageCopyOptions): Promise<boolean> {
    const fromBucket = this.resolveBucket(options?.fromBucket);
    const toBucket = this.resolveBucket(options?.toBucket || options?.fromBucket);

    const destOpts = toBucket !== fromBucket ? { destinationBucket: toBucket } : undefined;

    const { error } = await this.supabase.storage.from(fromBucket).copy(fromPath, toPath, destOpts);

    if (error) {
      logger.error({ error, fromPath, toPath, fromBucket, toBucket }, 'Supabase Storage copy failed');
      return false;
    }

    return true;
  }

  public async move(fromPath: string, toPath: string, options?: StorageCopyOptions): Promise<boolean> {
    const fromBucket = this.resolveBucket(options?.fromBucket);
    const toBucket = this.resolveBucket(options?.toBucket || options?.fromBucket);

    const destOpts = toBucket !== fromBucket ? { destinationBucket: toBucket } : undefined;

    const { error } = await this.supabase.storage.from(fromBucket).move(fromPath, toPath, destOpts);

    if (error) {
      logger.error({ error, fromPath, toPath, fromBucket, toBucket }, 'Supabase Storage move failed');
      return false;
    }

    return true;
  }
}
