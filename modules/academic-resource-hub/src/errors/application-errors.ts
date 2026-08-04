/**
 * Application Layer Typed Error Classes
 */

export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class DuplicateResourceError extends ApplicationError {
  constructor(message: string = 'A resource with this title or slug already exists.') {
    super(message);
    this.name = 'DuplicateResourceError';
  }
}

export class DuplicateHashError extends ApplicationError {
  constructor(message: string = 'A file with this SHA-256 hash has already been uploaded.') {
    super(message);
    this.name = 'DuplicateHashError';
  }
}

export class VersionConflictError extends ApplicationError {
  constructor(message: string = 'Target version conflict or version number already exists.') {
    super(message);
    this.name = 'VersionConflictError';
  }
}

export class InvalidResourceStateError extends ApplicationError {
  constructor(message: string = 'Resource is not in a valid state for this operation.') {
    super(message);
    this.name = 'InvalidResourceStateError';
  }
}

export class ResourceNotFoundError extends ApplicationError {
  constructor(message: string = 'Requested academic resource was not found.') {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

export class SelfVoteError extends ApplicationError {
  constructor(message: string = 'Uploaders cannot vote on their own study materials.') {
    super(message);
    this.name = 'SelfVoteError';
  }
}

export class InvalidUploadError extends ApplicationError {
  constructor(message: string = 'Upload metadata or binary stream is invalid.') {
    super(message);
    this.name = 'InvalidUploadError';
  }
}

export class VirusScanRequiredError extends ApplicationError {
  constructor(message: string = 'File must complete virus scanning before publication.') {
    super(message);
    this.name = 'VirusScanRequiredError';
  }
}

export class PermissionDeniedError extends ApplicationError {
  constructor(message: string = 'Permission denied for this operation.') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class ResourceQuarantinedError extends ApplicationError {
  constructor(message: string = 'This resource has been quarantined due to community reports.') {
    super(message);
    this.name = 'ResourceQuarantinedError';
  }
}

export class StorageUnavailableError extends ApplicationError {
  constructor(message: string = 'Storage service is temporarily unavailable.') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

export { SelfVoteProhibitedError, CollectionLimitExceededError } from './domain-errors.js';
