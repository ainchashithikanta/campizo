import { DomainError } from './domain-errors.js';

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = 'APPLICATION_ERROR', statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DuplicateListingError extends ApplicationError {
  constructor(message: string = 'Listing with this title or slug already exists.') {
    super(message, 'DUPLICATE_LISTING', 409);
  }
}

export class MediaProcessingPendingError extends ApplicationError {
  constructor(message: string = 'Media files are still undergoing virus scanning or processing.') {
    super(message, 'MEDIA_PROCESSING_PENDING', 422);
  }
}

export function mapDomainToApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }
  if (error instanceof DomainError) {
    switch (error.code) {
      case 'SELF_PURCHASE_NOT_ALLOWED':
        return new ApplicationError(error.message, error.code, 403);
      case 'CROSS_COLLEGE_OPERATION':
        return new ApplicationError(error.message, error.code, 403);
      case 'PERMISSION_DENIED':
        return new ApplicationError(error.message, error.code, 403);
      case 'LISTING_ALREADY_SOLD':
        return new ApplicationError(error.message, error.code, 409);
      case 'RESERVATION_ALREADY_EXISTS':
        return new ApplicationError(error.message, error.code, 409);
      case 'RESERVATION_EXPIRED':
        return new ApplicationError(error.message, error.code, 409);
      case 'OFFER_ALREADY_EXISTS':
        return new ApplicationError(error.message, error.code, 409);
      case 'DUPLICATE_CONVERSATION':
        return new ApplicationError(error.message, error.code, 409);
      case 'DUPLICATE_BOOKMARK':
        return new ApplicationError(error.message, error.code, 409);
      case 'DUPLICATE_REPORT':
        return new ApplicationError(error.message, error.code, 409);
      case 'LISTING_NOT_PUBLISHED':
        return new ApplicationError(error.message, error.code, 400);
      case 'LISTING_UNAVAILABLE':
        return new ApplicationError(error.message, error.code, 400);
      case 'INVALID_STATE_TRANSITION':
        return new ApplicationError(error.message, error.code, 400);
      case 'INVALID_MEDIA':
        return new ApplicationError(error.message, error.code, 400);
      default:
        return new ApplicationError(error.message, error.code, 400);
    }
  }
  if (error instanceof Error) {
    return new ApplicationError(error.message, 'INTERNAL_ERROR', 500);
  }
  return new ApplicationError('An unknown error occurred.', 'UNKNOWN_ERROR', 500);
}
