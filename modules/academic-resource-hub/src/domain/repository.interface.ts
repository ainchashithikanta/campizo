/**
 * Repository Contract Interfaces for Academic Resource Hub
 */

export interface AcademicResourceEntity {
  id: string;
  collegeId: string;
  departmentId: string;
  subjectId: string;
  courseId?: string | null;
  schemeId?: string | null;
  examTypeId?: string | null;
  resourceTypeId: string;
  uploaderUserId: string;
  title: string;
  slug: string;
  description?: string | null;
  academicYear: string;
  semesterNumber: number;
  isAnonymous: boolean;
  authorDisplayName?: string | null;
  status: 'PENDING' | 'APPROVED' | 'QUARANTINED' | 'REJECTED';
  verificationStatus: 'UNVERIFIED' | 'STUDENT_VERIFIED' | 'FACULTY_VERIFIED';
  currentVersionId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResourceVersionEntity {
  id: string;
  resourceId: string;
  versionNumber: number;
  changelogNotes?: string | null;
  createdByUserId: string;
  createdAt?: Date;
}

export interface ResourceFileEntity {
  id: string;
  versionId: string;
  storageProvider: string;
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  pageCount?: number | null;
  hasPreview: boolean;
  virusScanStatus: 'CLEAN' | 'PENDING' | 'INFECTED';
  createdAt?: Date;
}

export interface StudyCollectionEntity {
  id: string;
  collegeId: string;
  ownerUserId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  createdAt?: Date;
}

export interface ContributorEntity {
  id: string;
  collegeId: string;
  userId: string;
  reputationScore: number;
  totalUploads: number;
  totalHelpfulVotesReceived: number;
  badgeLevel: 'CONTRIBUTOR' | 'PEER_TUTOR' | 'VERIFIED_SCHOLAR';
  createdAt?: Date;
}

export interface ResourceStatisticsEntity {
  resourceId: string;
  collegeId: string;
  totalDownloads: number;
  totalViews: number;
  helpfulVotes: number;
  unhelpfulVotes: number;
  reportCount: number;
  bookmarkCount: number;
  bayesianQualityScore: number;
  lastCalculatedAt?: Date;
}

export interface AcademicResourceRepository {
  findById(id: string, collegeId: string): Promise<AcademicResourceEntity | null>;
  findBySlug(slug: string, collegeId: string): Promise<AcademicResourceEntity | null>;
  findBySubject(subjectId: string, collegeId: string): Promise<AcademicResourceEntity[]>;
  save(resource: AcademicResourceEntity): Promise<AcademicResourceEntity>;
  delete(id: string, collegeId: string): Promise<boolean>;
}

export interface ResourceVersionRepository {
  findById(id: string): Promise<ResourceVersionEntity | null>;
  findByResourceId(resourceId: string): Promise<ResourceVersionEntity[]>;
  findLatestVersionNumber(resourceId: string): Promise<number>;
  save(version: ResourceVersionEntity): Promise<ResourceVersionEntity>;
}

export interface StudyCollectionRepository {
  findById(id: string, collegeId: string): Promise<StudyCollectionEntity | null>;
  findByOwner(ownerUserId: string, collegeId: string): Promise<StudyCollectionEntity[]>;
  save(collection: StudyCollectionEntity): Promise<StudyCollectionEntity>;
  addResourceToCollection(collectionId: string, resourceId: string, positionOrder: number): Promise<void>;
  countCollectionResources(collectionId: string): Promise<number>;
}

export interface ContributorRepository {
  findByUser(userId: string, collegeId: string): Promise<ContributorEntity | null>;
  save(contributor: ContributorEntity): Promise<ContributorEntity>;
}

export interface StatisticsRepository {
  findByResourceId(resourceId: string, collegeId: string): Promise<ResourceStatisticsEntity | null>;
  save(stats: ResourceStatisticsEntity): Promise<ResourceStatisticsEntity>;
}

export interface StorageMetadataRepository {
  findFileByHash(sha256Hash: string): Promise<ResourceFileEntity | null>;
  saveFile(file: ResourceFileEntity): Promise<ResourceFileEntity>;
}
