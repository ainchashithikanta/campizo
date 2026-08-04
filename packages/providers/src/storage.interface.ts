import type { BaseProvider } from './base.interface.js';

export interface StorageUploadResult {
  path: string;
  url: string;
  sizeBytes: number;
}

export interface StorageProvider extends BaseProvider {
  readonly type: 'STORAGE';
  upload(path: string, content: Buffer | Uint8Array, mimeType: string): Promise<StorageUploadResult>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<boolean>;
  getPublicUrl(path: string): string;
}
