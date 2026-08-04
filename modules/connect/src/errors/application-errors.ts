/**
 * Campus Connect — Application Error Classes & Error Mapper
 * Maps domain errors into standardized application exceptions.
 */

import { CampusConnectDomainError } from './domain-errors.js';

export abstract class CampusConnectApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundApplicationError extends CampusConnectApplicationError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' was not found.`, 'NOT_FOUND', 404);
  }
}

export class ConflictApplicationError extends CampusConnectApplicationError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class ForbiddenApplicationError extends CampusConnectApplicationError {
  constructor(message: string = 'Access denied for this resource.') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class PrivacyApplicationError extends CampusConnectApplicationError {
  constructor(message: string) {
    super(message, 'PRIVACY_RESTRICTED', 403);
  }
}

export class ValidationApplicationError extends CampusConnectApplicationError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class LockedApplicationError extends CampusConnectApplicationError {
  constructor(message: string) {
    super(message, 'OPTIMISTIC_LOCK_CONFLICT', 409);
  }
}

export class FeatureDisabledApplicationError extends CampusConnectApplicationError {
  constructor(flagKey: string) {
    super(`Capability '${flagKey}' is currently disabled for this tenant.`, 'FEATURE_DISABLED', 403);
  }
}

/**
 * Maps domain errors to application errors
 */
export function mapDomainErrorToApplicationError(error: unknown): CampusConnectApplicationError {
  if (error instanceof CampusConnectApplicationError) {
    return error;
  }
  if (error instanceof CampusConnectDomainError) {
    switch (error.code) {
      case 'DUPLICATE_INTENT':
      case 'ALREADY_CONNECTED':
        return new ConflictApplicationError(error.message);
      case 'INTENT_EXPIRED':
      case 'RECOMMENDATION_EXPIRED':
        return new ValidationApplicationError(error.message);
      case 'PRIVACY_VIOLATION':
      case 'VISIBILITY_VIOLATION':
        return new PrivacyApplicationError(error.message);
      case 'CONNECTION_BLOCKED':
      case 'CROSS_COLLEGE_VIOLATION':
      case 'TRUST_SCORE_VIOLATION':
        return new ForbiddenApplicationError(error.message);
      case 'INVALID_CONVERSATION_CONTEXT':
      case 'ILLEGAL_STATE_TRANSITION':
        return new ValidationApplicationError(error.message);
      case 'FEATURE_DISABLED':
        return new FeatureDisabledApplicationError(error.message);
      case 'OPTIMISTIC_LOCKING_CONFLICT':
        return new LockedApplicationError(error.message);
      default:
        return new ValidationApplicationError(error.message);
    }
  }
  return new ValidationApplicationError(error instanceof Error ? error.message : 'Unknown application error occurred.');
}
