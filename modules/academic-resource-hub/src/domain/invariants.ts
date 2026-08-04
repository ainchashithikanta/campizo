import {
  TenantMismatchError,
  DuplicateFileHashError,
  SelfVoteProhibitedError,
  CollectionLimitExceededError,
  MissingVersionError,
  InvalidFileMetadataError,
  DomainValidationError
} from '../errors/domain-errors.js';

export interface ResourceInvariantCheck {
  title: string;
  collegeId: string;
  uploaderUserId: string;
  subjectId: string;
}

export interface FileMetadataInvariantCheck {
  fileSizeBytes: number;
  mimeType: string;
}

/**
 * Validates resource title, college context, and uploader IDs
 */
export function assertValidResource(resource: ResourceInvariantCheck): void {
  if (!resource.title || resource.title.trim().length < 3) {
    throw new DomainValidationError('Resource title must be at least 3 characters long.');
  }
  if (!resource.collegeId) {
    throw new DomainValidationError('Resource must belong to a valid college tenant.');
  }
  if (!resource.uploaderUserId) {
    throw new DomainValidationError('Resource must have a valid uploader user ID.');
  }
  if (!resource.subjectId) {
    throw new DomainValidationError('Resource must be assigned to a valid subject.');
  }
}

/**
 * Asserts user belongs to the same college tenant as the resource
 */
export function assertSameCollege(userCollegeId: string, resourceCollegeId: string): void {
  if (!userCollegeId || !resourceCollegeId || userCollegeId !== resourceCollegeId) {
    throw new TenantMismatchError('User college tenant does not match resource college tenant.');
  }
}

/**
 * Asserts file SHA-256 hash is unique and does not match existing files
 */
export function assertDuplicateHash(incomingHash: string, existingHashes: Set<string> | string[]): void {
  const hashSet = Array.isArray(existingHashes) ? new Set(existingHashes) : existingHashes;
  if (hashSet.has(incomingHash)) {
    throw new DuplicateFileHashError(`A file with SHA-256 hash [${incomingHash}] already exists in the repository.`);
  }
}

/**
 * Asserts that a current version pointer is non-null for published resources
 */
export function assertCurrentVersionExists(currentVersionId: string | null | undefined): void {
  if (!currentVersionId) {
    throw new MissingVersionError('Resource cannot be published without a current version ID pointer.');
  }
}

/**
 * Asserts that a study collection does not exceed 50 items
 */
export function assertCollectionLimit(currentCount: number): void {
  if (currentCount >= 50) {
    throw new CollectionLimitExceededError('Study collection capacity limit of 50 items reached.');
  }
}

/**
 * Prevents uploaders from voting on their own study materials
 */
export function assertNoSelfVote(uploaderUserId: string, voterUserId: string): void {
  if (uploaderUserId && voterUserId && uploaderUserId === voterUserId) {
    throw new SelfVoteProhibitedError('Uploaders cannot vote on their own study materials.');
  }
}

/**
 * Asserts that a published version exists in version history
 */
export function assertPublishedVersion(versionCount: number): void {
  if (versionCount <= 0) {
    throw new MissingVersionError('Cannot publish resource with 0 versions in version history.');
  }
}

/**
 * Asserts file size bounds (50KB <= size <= 50MB) and approved MIME types
 */
export function assertValidFileMetadata(fileMeta: FileMetadataInvariantCheck): void {
  const MIN_SIZE = 50 * 1024; // 50 KB
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
  const APPROVED_MIMES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  if (fileMeta.fileSizeBytes < MIN_SIZE || fileMeta.fileSizeBytes > MAX_SIZE) {
    throw new InvalidFileMetadataError(
      `File size (${fileMeta.fileSizeBytes} bytes) is outside permitted 50KB - 50MB bounds.`
    );
  }

  if (!APPROVED_MIMES.includes(fileMeta.mimeType)) {
    throw new InvalidFileMetadataError(`MIME type [${fileMeta.mimeType}] is not an approved academic document type.`);
  }
}
