/**
 * Domain Events Definitions for Academic Resource Hub
 */

export const AcademicResourceEvents = {
  CREATED: 'AcademicResourceCreated',
  PUBLISHED: 'AcademicResourcePublished',
  ARCHIVED: 'AcademicResourceArchived',
  DELETED: 'AcademicResourceDeleted',
  VERSION_CREATED: 'ResourceVersionCreated',
  VERSION_PUBLISHED: 'ResourceVersionPublished',
  DOWNLOADED: 'ResourceDownloaded',
  VIEWED: 'ResourceViewed',
  VOTE_ADDED: 'ResourceVoteAdded',
  REPORTED: 'ResourceReported',
  BOOKMARKED: 'ResourceBookmarked',
  COLLECTION_CREATED: 'StudyCollectionCreated',
  COLLECTION_UPDATED: 'StudyCollectionUpdated',
  STATISTICS_UPDATED: 'StatisticsUpdated',
  CONTRIBUTOR_UPDATED: 'ContributorUpdated'
} as const;

export interface BaseDomainEvent<T> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  collegeId: string;
  timestamp: string;
  payload: T;
}

export interface AcademicResourceCreatedPayload {
  resourceId: string;
  subjectId: string;
  departmentId: string;
  uploaderUserId: string;
  title: string;
  categoryCode: string;
}

export interface AcademicResourcePublishedPayload {
  resourceId: string;
  publishedVersionId: string;
  versionNumber: number;
}

export interface ResourceVersionCreatedPayload {
  versionId: string;
  resourceId: string;
  versionNumber: number;
  fileSizeBytes: number;
  sha256Hash: string;
}

export interface ResourceDownloadedPayload {
  resourceId: string;
  userId: string;
  ipAddress?: string;
}

export interface ResourceVoteAddedPayload {
  resourceId: string;
  voterUserId: string;
  voteType: 'HELPFUL' | 'UNHELPFUL';
}

export interface ResourceReportedPayload {
  resourceId: string;
  reporterUserId: string;
  reason: string;
  totalReportCount: number;
}

export interface StudyCollectionCreatedPayload {
  collectionId: string;
  ownerUserId: string;
  title: string;
}

export interface StatisticsUpdatedPayload {
  resourceId: string;
  totalDownloads: number;
  bayesianQualityScore: number;
}

export type AcademicResourceCreatedEvent = BaseDomainEvent<AcademicResourceCreatedPayload>;
export type AcademicResourcePublishedEvent = BaseDomainEvent<AcademicResourcePublishedPayload>;
export type ResourceVersionCreatedEvent = BaseDomainEvent<ResourceVersionCreatedPayload>;
export type ResourceDownloadedEvent = BaseDomainEvent<ResourceDownloadedPayload>;
export type ResourceVoteAddedEvent = BaseDomainEvent<ResourceVoteAddedPayload>;
export type ResourceReportedEvent = BaseDomainEvent<ResourceReportedPayload>;
export type StudyCollectionCreatedEvent = BaseDomainEvent<StudyCollectionCreatedPayload>;
export type StatisticsUpdatedEvent = BaseDomainEvent<StatisticsUpdatedPayload>;
