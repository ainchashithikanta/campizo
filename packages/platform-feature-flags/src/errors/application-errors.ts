/**
 * Platform Feature Flags Application Errors
 * Wraps and maps domain errors for safe application service boundaries.
 */

import { DomainError } from './domain-errors.js';

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;

  constructor(message: string, code: string = 'APPLICATION_ERROR', httpStatus: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundApplicationError extends ApplicationError {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} '${identifier}' was not found.`, 'NOT_FOUND', 404);
  }
}

export class ConflictApplicationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class UnprocessableApplicationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'UNPROCESSABLE_ENTITY', 422);
  }
}

export class ForbiddenApplicationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403);
  }
}

export class LockedApplicationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'LOCKED', 423);
  }
}

/**
 * Maps any domain error into an application error instance safely.
 */
export function mapDomainToApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }
  if (error && typeof error === 'object' && ('name' in error) && (error as any).name === 'ZodError') {
    return new ApplicationError(
      (error as Error).message || 'Invalid request payload validation.',
      'INVALID_PAYLOAD',
      400
    );
  }
  if (error instanceof DomainError) {
    switch (error.code) {
      case 'DUPLICATE_FEATURE_KEY':
      case 'FEATURE_ALREADY_ENABLED':
      case 'FEATURE_ALREADY_DISABLED':
        return new ConflictApplicationError(error.message);
      case 'CIRCULAR_DEPENDENCY':
      case 'DEPENDENCY_NOT_SATISFIED':
      case 'INVALID_LIFECYCLE_TRANSITION':
      case 'INVALID_ROLLOUT':
        return new UnprocessableApplicationError(error.message);
      case 'APPROVAL_REQUIRED':
      case 'APPROVAL_EXPIRED':
        return new ForbiddenApplicationError(error.message);
      case 'KILL_SWITCH_ACTIVE':
      case 'MAINTENANCE_ACTIVE':
      case 'SNAPSHOT_IMMUTABLE':
        return new LockedApplicationError(error.message);
      case 'FEATURE_REMOVED':
        return new ApplicationError(error.message, 'FEATURE_REMOVED', 410);
      default:
        return new ApplicationError(error.message, error.code, 400);
    }
  }
  return new ApplicationError(
    error instanceof Error ? error.message : 'An unexpected application error occurred.',
    'INTERNAL_ERROR',
    500
  );
}
