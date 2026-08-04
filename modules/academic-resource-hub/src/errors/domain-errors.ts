/**
 * Academic Resource Hub Domain Error Classes
 */

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

export class TenantMismatchError extends DomainValidationError {
  constructor(message: string = 'User does not belong to the resource college tenant.') {
    super(message);
    this.name = 'TenantMismatchError';
  }
}

export class DuplicateFileHashError extends DomainValidationError {
  constructor(message: string = 'A file with this identical SHA-256 hash already exists.') {
    super(message);
    this.name = 'DuplicateFileHashError';
  }
}

export class SelfVoteProhibitedError extends DomainValidationError {
  constructor(message: string = 'Uploaders are strictly prohibited from voting on their own resources.') {
    super(message);
    this.name = 'SelfVoteProhibitedError';
  }
}

export class CollectionLimitExceededError extends DomainValidationError {
  constructor(message: string = 'Study collections cannot contain more than 50 resources.') {
    super(message);
    this.name = 'CollectionLimitExceededError';
  }
}

export class MissingVersionError extends DomainValidationError {
  constructor(message: string = 'A published resource must have at least one valid published version.') {
    super(message);
    this.name = 'MissingVersionError';
  }
}

export class InvalidFileMetadataError extends DomainValidationError {
  constructor(message: string = 'Invalid file size or unapproved MIME type.') {
    super(message);
    this.name = 'InvalidFileMetadataError';
  }
}
