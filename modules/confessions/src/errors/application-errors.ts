import { DomainError } from './domain-errors.js';

export interface ApplicationErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function mapDomainErrorToApplicationError(error: unknown): ApplicationErrorEnvelope {
  if (error instanceof DomainError) {
    switch (error.code) {
      case 'CROSS_COLLEGE_ACCESS_FORBIDDEN':
      case 'IDENTITY_ACCESS_DENIED':
      case 'SELF_VOTE_PROHIBITED':
      case 'MODERATION_ACCESS_DENIED':
        return {
          statusCode: 403,
          code: error.code,
          message: error.message
        };

      case 'DUPLICATE_VOTE':
      case 'DUPLICATE_BOOKMARK':
      case 'DUPLICATE_REPORT':
        return {
          statusCode: 409,
          code: error.code,
          message: error.message
        };

      case 'CONFESSION_NOT_FOUND':
        return {
          statusCode: 404,
          code: error.code,
          message: error.message
        };

      case 'THREAD_DEPTH_EXCEEDED':
      case 'INVALID_STATE_TRANSITION':
        return {
          statusCode: 400,
          code: error.code,
          message: error.message
        };

      default:
        return {
          statusCode: 400,
          code: error.code,
          message: error.message
        };
    }
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.'
  };
}
