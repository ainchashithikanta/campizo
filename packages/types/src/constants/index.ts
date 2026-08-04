export const PLATFORM_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_FILE_SIZE_BYTES: 52_428_800, // 50MB limit
  ALLOWED_IMAGE_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  ALLOWED_DOCUMENT_MIME_TYPES: ['application/pdf'],
  JWT_DEFAULT_EXPIRATION: '15m',
  REFRESH_TOKEN_DEFAULT_EXPIRATION: '7d'
} as const;
