import type { BaseProvider } from './base.interface.js';

export interface ImageProcessingProvider extends BaseProvider {
  readonly type: 'IMAGE_PROCESSING';
  resizeImage(buffer: Buffer, width: number, height: number): Promise<Buffer>;
  compressImage(buffer: Buffer, quality: number): Promise<Buffer>;
}
