import type { EventBus } from '@college-hub/core';
import type {
  AcademicResourceRepository,
  ResourceVersionRepository,
  StudyCollectionRepository,
  ContributorRepository,
  StatisticsRepository,
  StorageMetadataRepository,
  AcademicResourceEntity,
  ResourceVersionEntity,
  ResourceFileEntity,
  StudyCollectionEntity,
  ResourceStatisticsEntity,
  ContributorEntity
} from '../domain/repository.interface.js';
import {
  assertValidResource,
  assertCurrentVersionExists,
  assertCollectionLimit,
  assertNoSelfVote,
  assertValidFileMetadata
} from '../domain/invariants.js';
import {
  ResourceNotFoundError,
  DuplicateHashError,
  InvalidResourceStateError
} from '../errors/application-errors.js';
import { AcademicResourceEvents } from '../domain/events.js';

/**
 * 1. Create Academic Resource Use-Case
 */
export class CreateAcademicResourceUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private versionRepo: ResourceVersionRepository,
    private storageRepo: StorageMetadataRepository,
    private statsRepo: StatisticsRepository,
    private eventBus: EventBus
  ) {}

  public async execute(input: {
    collegeId: string;
    departmentId: string;
    subjectId: string;
    courseId?: string;
    schemeId?: string;
    examTypeId?: string;
    resourceTypeId: string;
    uploaderUserId: string;
    title: string;
    slug: string;
    description?: string;
    academicYear: string;
    semesterNumber: number;
    isAnonymous?: boolean;
    authorDisplayName?: string;
    fileSizeBytes: number;
    mimeType: string;
    sha256Hash: string;
    fileName: string;
    storageKey: string;
  }): Promise<AcademicResourceEntity> {
    assertValidResource({
      title: input.title,
      collegeId: input.collegeId,
      uploaderUserId: input.uploaderUserId,
      subjectId: input.subjectId
    });

    assertValidFileMetadata({
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType
    });

    const existingFile = await this.storageRepo.findFileByHash(input.sha256Hash);
    if (existingFile) {
      throw new DuplicateHashError(`File with SHA-256 hash [${input.sha256Hash}] already exists.`);
    }

    const resourceId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const versionId = `ver-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const version: ResourceVersionEntity = {
      id: versionId,
      resourceId,
      versionNumber: 1,
      changelogNotes: 'Initial upload',
      createdByUserId: input.uploaderUserId
    };
    await this.versionRepo.save(version);

    const file: ResourceFileEntity = {
      id: fileId,
      versionId,
      storageProvider: 'S3',
      storageKey: input.storageKey,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      sha256Hash: input.sha256Hash,
      hasPreview: false,
      virusScanStatus: 'CLEAN'
    };
    await this.storageRepo.saveFile(file);

    const resource: AcademicResourceEntity = {
      id: resourceId,
      collegeId: input.collegeId,
      departmentId: input.departmentId,
      subjectId: input.subjectId,
      courseId: input.courseId ?? null,
      schemeId: input.schemeId ?? null,
      examTypeId: input.examTypeId ?? null,
      resourceTypeId: input.resourceTypeId,
      uploaderUserId: input.uploaderUserId,
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      academicYear: input.academicYear,
      semesterNumber: input.semesterNumber,
      isAnonymous: input.isAnonymous ?? false,
      authorDisplayName: input.authorDisplayName ?? null,
      status: 'APPROVED',
      verificationStatus: 'UNVERIFIED',
      currentVersionId: versionId
    };

    const savedResource = await this.resourceRepo.save(resource);

    const initialStats: ResourceStatisticsEntity = {
      resourceId,
      collegeId: input.collegeId,
      totalDownloads: 0,
      totalViews: 0,
      helpfulVotes: 0,
      unhelpfulVotes: 0,
      reportCount: 0,
      bookmarkCount: 0,
      bayesianQualityScore: 0.0
    };
    await this.statsRepo.save(initialStats);

    await this.eventBus.publish(AcademicResourceEvents.CREATED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.CREATED,
      aggregateId: resourceId,
      collegeId: input.collegeId,
      timestamp: new Date().toISOString(),
      payload: {
        resourceId,
        subjectId: input.subjectId,
        departmentId: input.departmentId,
        uploaderUserId: input.uploaderUserId,
        title: input.title,
        categoryCode: input.resourceTypeId
      }
    });

    return savedResource;
  }
}

/**
 * 2. Publish Academic Resource Use-Case
 */
export class PublishAcademicResourceUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, collegeId: string): Promise<AcademicResourceEntity> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    assertCurrentVersionExists(resource.currentVersionId);

    resource.status = 'APPROVED';
    const updated = await this.resourceRepo.save(resource);

    await this.eventBus.publish(AcademicResourceEvents.PUBLISHED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.PUBLISHED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: {
        resourceId,
        publishedVersionId: resource.currentVersionId!,
        versionNumber: 1
      }
    });

    return updated;
  }
}

/**
 * 3. Archive Academic Resource Use-Case
 */
export class ArchiveAcademicResourceUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, collegeId: string): Promise<AcademicResourceEntity> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    resource.status = 'REJECTED';
    const updated = await this.resourceRepo.save(resource);

    await this.eventBus.publish(AcademicResourceEvents.ARCHIVED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.ARCHIVED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId }
    });

    return updated;
  }
}

/**
 * 4. Replace Academic Resource Use-Case
 */
export class ReplaceAcademicResourceUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, collegeId: string, newVersionId: string): Promise<AcademicResourceEntity> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    resource.currentVersionId = newVersionId;
    const updated = await this.resourceRepo.save(resource);

    await this.eventBus.publish(AcademicResourceEvents.VERSION_PUBLISHED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.VERSION_PUBLISHED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId, publishedVersionId: newVersionId, versionNumber: 2 }
    });

    return updated;
  }
}

/**
 * 5. Create Resource Version Use-Case
 */
export class CreateResourceVersionUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private versionRepo: ResourceVersionRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, collegeId: string, createdByUserId: string, notes?: string): Promise<ResourceVersionEntity> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    const latest = await this.versionRepo.findLatestVersionNumber(resourceId);
    const nextVersionNumber = latest + 1;

    const version: ResourceVersionEntity = {
      id: `ver-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      resourceId,
      versionNumber: nextVersionNumber,
      changelogNotes: notes ?? null,
      createdByUserId
    };

    const saved = await this.versionRepo.save(version);

    await this.eventBus.publish(AcademicResourceEvents.VERSION_CREATED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.VERSION_CREATED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { versionId: saved.id, resourceId, versionNumber: nextVersionNumber, fileSizeBytes: 0, sha256Hash: '' }
    });

    return saved;
  }
}

/**
 * 6. Publish Version Use-Case
 */
export class PublishVersionUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private versionRepo: ResourceVersionRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, versionId: string, collegeId: string): Promise<AcademicResourceEntity> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    const version = await this.versionRepo.findById(versionId);
    if (!version) throw new ResourceNotFoundError(`Version [${versionId}] not found.`);

    resource.currentVersionId = versionId;
    const updated = await this.resourceRepo.save(resource);

    await this.eventBus.publish(AcademicResourceEvents.VERSION_PUBLISHED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.VERSION_PUBLISHED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId, publishedVersionId: versionId, versionNumber: version.versionNumber }
    });

    return updated;
  }
}

/**
 * 7. Rollback Version Use-Case
 */
export class RollbackVersionUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private versionRepo: ResourceVersionRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, targetVersionId: string, collegeId: string): Promise<AcademicResourceEntity> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    const targetVersion = await this.versionRepo.findById(targetVersionId);
    if (!targetVersion || targetVersion.resourceId !== resourceId) {
      throw new InvalidResourceStateError(`Target version [${targetVersionId}] does not belong to resource.`);
    }

    resource.currentVersionId = targetVersionId;
    const updated = await this.resourceRepo.save(resource);

    await this.eventBus.publish(AcademicResourceEvents.VERSION_PUBLISHED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.VERSION_PUBLISHED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId, publishedVersionId: targetVersionId, versionNumber: targetVersion.versionNumber }
    });

    return updated;
  }
}

/**
 * 8. Create Study Collection Use-Case
 */
export class CreateStudyCollectionUseCase {
  constructor(
    private collectionRepo: StudyCollectionRepository,
    private eventBus: EventBus
  ) {}

  public async execute(collegeId: string, ownerUserId: string, title: string, description?: string): Promise<StudyCollectionEntity> {
    const collection: StudyCollectionEntity = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      collegeId,
      ownerUserId,
      title,
      description: description ?? null,
      isPublic: true
    };

    const saved = await this.collectionRepo.save(collection);

    await this.eventBus.publish(AcademicResourceEvents.COLLECTION_CREATED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.COLLECTION_CREATED,
      aggregateId: saved.id,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { collectionId: saved.id, ownerUserId, title }
    });

    return saved;
  }
}

/**
 * 9. Update Study Collection Use-Case
 */
export class UpdateStudyCollectionUseCase {
  constructor(private collectionRepo: StudyCollectionRepository) {}

  public async execute(collectionId: string, collegeId: string, title: string, description?: string): Promise<StudyCollectionEntity> {
    const collection = await this.collectionRepo.findById(collectionId, collegeId);
    if (!collection) throw new ResourceNotFoundError(`Collection [${collectionId}] not found.`);

    collection.title = title;
    if (description !== undefined) collection.description = description;

    return await this.collectionRepo.save(collection);
  }
}

/**
 * 10. Add Resource To Collection Use-Case
 */
export class AddResourceToCollectionUseCase {
  constructor(private collectionRepo: StudyCollectionRepository) {}

  public async execute(collectionId: string, resourceId: string, collegeId: string): Promise<void> {
    const collection = await this.collectionRepo.findById(collectionId, collegeId);
    if (!collection) throw new ResourceNotFoundError(`Collection [${collectionId}] not found.`);

    const count = await this.collectionRepo.countCollectionResources(collectionId);
    assertCollectionLimit(count);

    await this.collectionRepo.addResourceToCollection(collectionId, resourceId, count + 1);
  }
}

/**
 * 11. Remove Resource From Collection Use-Case
 */
export class RemoveResourceFromCollectionUseCase {
  constructor(private collectionRepo: StudyCollectionRepository) {}

  public async execute(collectionId: string, _resourceId: string, collegeId: string): Promise<void> {
    const collection = await this.collectionRepo.findById(collectionId, collegeId);
    if (!collection) throw new ResourceNotFoundError(`Collection [${collectionId}] not found.`);
  }
}

/**
 * 12. Bookmark Resource Use-Case
 */
export class BookmarkResourceUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, userId: string, collegeId: string): Promise<void> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    await this.eventBus.publish(AcademicResourceEvents.BOOKMARKED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.BOOKMARKED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId, userId }
    });
  }
}

/**
 * 13. Vote Helpful Use-Case
 */
export class VoteHelpfulUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, voterUserId: string, collegeId: string, isHelpful: boolean): Promise<void> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    assertNoSelfVote(resource.uploaderUserId, voterUserId);

    await this.eventBus.publish(AcademicResourceEvents.VOTE_ADDED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.VOTE_ADDED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: {
        resourceId,
        voterUserId,
        voteType: isHelpful ? 'HELPFUL' : 'UNHELPFUL'
      }
    });
  }
}

/**
 * 14. Report Resource Use-Case
 */
export class ReportResourceUseCase {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private statsRepo: StatisticsRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, reporterUserId: string, collegeId: string, reason: string): Promise<void> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) throw new ResourceNotFoundError(`Resource [${resourceId}] not found.`);

    let stats = await this.statsRepo.findByResourceId(resourceId, collegeId);
    if (!stats) {
      stats = {
        resourceId,
        collegeId,
        totalDownloads: 0,
        totalViews: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        reportCount: 0,
        bookmarkCount: 0,
        bayesianQualityScore: 0.0
      };
    }

    stats.reportCount += 1;
    await this.statsRepo.save(stats);

    if (stats.reportCount >= 3) {
      resource.status = 'QUARANTINED';
      await this.resourceRepo.save(resource);
    }

    await this.eventBus.publish(AcademicResourceEvents.REPORTED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.REPORTED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId, reporterUserId, reason, totalReportCount: stats.reportCount }
    });
  }
}

/**
 * 15. Record Download Use-Case
 */
export class RecordDownloadUseCase {
  constructor(
    private statsRepo: StatisticsRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, userId: string, collegeId: string): Promise<void> {
    let stats = await this.statsRepo.findByResourceId(resourceId, collegeId);
    if (!stats) {
      stats = {
        resourceId,
        collegeId,
        totalDownloads: 0,
        totalViews: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        reportCount: 0,
        bookmarkCount: 0,
        bayesianQualityScore: 0.0
      };
    }

    stats.totalDownloads += 1;
    await this.statsRepo.save(stats);

    await this.eventBus.publish(AcademicResourceEvents.DOWNLOADED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.DOWNLOADED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId, userId }
    });
  }
}

/**
 * 16. Record View Use-Case
 */
export class RecordViewUseCase {
  constructor(
    private statsRepo: StatisticsRepository,
    private eventBus: EventBus
  ) {}

  public async execute(resourceId: string, userId: string, collegeId: string): Promise<void> {
    let stats = await this.statsRepo.findByResourceId(resourceId, collegeId);
    if (!stats) {
      stats = {
        resourceId,
        collegeId,
        totalDownloads: 0,
        totalViews: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        reportCount: 0,
        bookmarkCount: 0,
        bayesianQualityScore: 0.0
      };
    }

    stats.totalViews += 1;
    await this.statsRepo.save(stats);

    await this.eventBus.publish(AcademicResourceEvents.VIEWED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.VIEWED,
      aggregateId: resourceId,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { resourceId, userId }
    });
  }
}

/**
 * 17. Update Contributor Reputation Use-Case
 */
export class UpdateContributorReputationUseCase {
  constructor(
    private contributorRepo: ContributorRepository,
    private eventBus: EventBus
  ) {}

  public async execute(userId: string, collegeId: string, pointsDelta: number): Promise<ContributorEntity> {
    let contributor = await this.contributorRepo.findByUser(userId, collegeId);
    if (!contributor) {
      contributor = {
        id: `contrib-${Date.now()}`,
        collegeId,
        userId,
        reputationScore: 0,
        totalUploads: 0,
        totalHelpfulVotesReceived: 0,
        badgeLevel: 'CONTRIBUTOR'
      };
    }

    contributor.reputationScore += pointsDelta;
    if (contributor.reputationScore >= 50) {
      contributor.badgeLevel = 'PEER_TUTOR';
    }

    const saved = await this.contributorRepo.save(contributor);

    await this.eventBus.publish(AcademicResourceEvents.CONTRIBUTOR_UPDATED, {
      eventId: `evt-${Date.now()}`,
      eventType: AcademicResourceEvents.CONTRIBUTOR_UPDATED,
      aggregateId: saved.id,
      collegeId,
      timestamp: new Date().toISOString(),
      payload: { userId, reputationScore: saved.reputationScore, badgeLevel: saved.badgeLevel }
    });

    return saved;
  }
}
