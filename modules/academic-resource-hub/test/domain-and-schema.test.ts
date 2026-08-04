import { describe, it, expect } from 'vitest';
import {
  academicResources,
  resourceVersions,
  resourceFiles,
  studyCollections,
  resourceVotes,
  resourceStatistics,
  assertValidResource,
  assertSameCollege,
  assertDuplicateHash,
  assertCurrentVersionExists,
  assertCollectionLimit,
  assertNoSelfVote,
  assertPublishedVersion,
  assertValidFileMetadata,
  DomainValidationError,
  TenantMismatchError,
  DuplicateFileHashError,
  SelfVoteProhibitedError,
  CollectionLimitExceededError,
  MissingVersionError,
  InvalidFileMetadataError
} from '../src/index.js';

describe('Academic Resource Hub Database Schema & Domain Invariants', () => {
  describe('Drizzle ORM Schema Export Integrity', () => {
    it('should export valid Drizzle schema tables with primary and foreign key columns', () => {
      expect(academicResources).toBeDefined();
      expect(academicResources.id).toBeDefined();
      expect(academicResources.collegeId).toBeDefined();
      expect(academicResources.subjectId).toBeDefined();

      expect(resourceVersions).toBeDefined();
      expect(resourceVersions.resourceId).toBeDefined();

      expect(resourceFiles).toBeDefined();
      expect(resourceFiles.sha256Hash).toBeDefined();

      expect(studyCollections).toBeDefined();
      expect(resourceVotes).toBeDefined();
      expect(resourceStatistics).toBeDefined();
    });
  });

  describe('Domain Invariants: assertValidResource', () => {
    it('should pass for a valid resource specification', () => {
      expect(() =>
        assertValidResource({
          title: 'CS501 Operating Systems Notes',
          collegeId: 'college-stanford-001',
          uploaderUserId: 'user-student-101',
          subjectId: 'subject-os-501'
        })
      ).not.toThrow();
    });

    it('should throw DomainValidationError if title is too short', () => {
      expect(() =>
        assertValidResource({
          title: 'OS',
          collegeId: 'college-stanford-001',
          uploaderUserId: 'user-student-101',
          subjectId: 'subject-os-501'
        })
      ).toThrow(DomainValidationError);
    });

    it('should throw DomainValidationError if collegeId is missing', () => {
      expect(() =>
        assertValidResource({
          title: 'Operating Systems Notes',
          collegeId: '',
          uploaderUserId: 'user-student-101',
          subjectId: 'subject-os-501'
        })
      ).toThrow(DomainValidationError);
    });
  });

  describe('Domain Invariants: assertSameCollege', () => {
    it('should pass when user and resource belong to the same college tenant', () => {
      expect(() => assertSameCollege('college-stanford-001', 'college-stanford-001')).not.toThrow();
    });

    it('should throw TenantMismatchError when user belongs to a different college tenant', () => {
      expect(() => assertSameCollege('college-mit-002', 'college-stanford-001')).toThrow(TenantMismatchError);
    });
  });

  describe('Domain Invariants: assertDuplicateHash', () => {
    it('should pass when file SHA-256 hash is unique', () => {
      const existingHashes = new Set(['hash-aaa', 'hash-bbb']);
      expect(() => assertDuplicateHash('hash-ccc', existingHashes)).not.toThrow();
    });

    it('should throw DuplicateFileHashError when file SHA-256 hash already exists in repository', () => {
      const existingHashes = new Set(['hash-aaa', 'hash-bbb']);
      expect(() => assertDuplicateHash('hash-aaa', existingHashes)).toThrow(DuplicateFileHashError);
    });
  });

  describe('Domain Invariants: assertCurrentVersionExists & assertPublishedVersion', () => {
    it('should pass when current version pointer exists and version count > 0', () => {
      expect(() => assertCurrentVersionExists('version-uuid-101')).not.toThrow();
      expect(() => assertPublishedVersion(2)).not.toThrow();
    });

    it('should throw MissingVersionError if current version ID is missing or version count is 0', () => {
      expect(() => assertCurrentVersionExists(null)).toThrow(MissingVersionError);
      expect(() => assertPublishedVersion(0)).toThrow(MissingVersionError);
    });
  });

  describe('Domain Invariants: assertCollectionLimit', () => {
    it('should pass when collection item count is under 50', () => {
      expect(() => assertCollectionLimit(49)).not.toThrow();
    });

    it('should throw CollectionLimitExceededError when collection reaches capacity limit of 50 items', () => {
      expect(() => assertCollectionLimit(50)).toThrow('Study collection capacity limit of 50 items reached.');
    });
  });

  describe('Domain Invariants: assertNoSelfVote', () => {
    it('should pass when voter is a different student than the uploader', () => {
      expect(() => assertNoSelfVote('uploader-user-101', 'voter-user-202')).not.toThrow();
    });

    it('should throw SelfVoteProhibitedError when uploader attempts to vote on their own material', () => {
      expect(() => assertNoSelfVote('uploader-user-101', 'uploader-user-101')).toThrow(SelfVoteProhibitedError);
    });
  });

  describe('Domain Invariants: assertValidFileMetadata', () => {
    it('should pass for valid PDF file metadata within bounds', () => {
      expect(() =>
        assertValidFileMetadata({
          fileSizeBytes: 2 * 1024 * 1024, // 2 MB
          mimeType: 'application/pdf'
        })
      ).not.toThrow();
    });

    it('should throw InvalidFileMetadataError if file size is below 50KB or above 50MB', () => {
      expect(() =>
        assertValidFileMetadata({
          fileSizeBytes: 10 * 1024, // 10 KB (too small)
          mimeType: 'application/pdf'
        })
      ).toThrow(InvalidFileMetadataError);

      expect(() =>
        assertValidFileMetadata({
          fileSizeBytes: 60 * 1024 * 1024, // 60 MB (too large)
          mimeType: 'application/pdf'
        })
      ).toThrow(InvalidFileMetadataError);
    });

    it('should throw InvalidFileMetadataError if MIME type is an unapproved extension', () => {
      expect(() =>
        assertValidFileMetadata({
          fileSizeBytes: 1 * 1024 * 1024,
          mimeType: 'application/x-msdownload' // .exe
        })
      ).toThrow(InvalidFileMetadataError);
    });
  });
});
