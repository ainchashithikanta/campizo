import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  academicResources,
  resourceVersions,
  studyCollections,
  collectionResources,
  contributors,
  resourceStatistics,
  resourceFiles
} from '../schema/academic-resource-hub.schema.js';
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
  ContributorEntity,
  ResourceStatisticsEntity
} from '../domain/repository.interface.js';

export class DrizzleAcademicResourceRepository implements AcademicResourceRepository {
  constructor(private db: NodePgDatabase<any>) {}

  public async findById(id: string, collegeId: string): Promise<AcademicResourceEntity | null> {
    const rows = await this.db
      .select()
      .from(academicResources)
      .where(
        and(
          eq(academicResources.id, id),
          eq(academicResources.collegeId, collegeId),
          isNull(academicResources.deletedAt)
        )
      )
      .limit(1);

    return (rows[0] as AcademicResourceEntity) || null;
  }

  public async findBySlug(slug: string, collegeId: string): Promise<AcademicResourceEntity | null> {
    const rows = await this.db
      .select()
      .from(academicResources)
      .where(
        and(
          eq(academicResources.slug, slug),
          eq(academicResources.collegeId, collegeId),
          isNull(academicResources.deletedAt)
        )
      )
      .limit(1);

    return (rows[0] as AcademicResourceEntity) || null;
  }

  public async findBySubject(subjectId: string, collegeId: string): Promise<AcademicResourceEntity[]> {
    const rows = await this.db
      .select()
      .from(academicResources)
      .where(
        and(
          eq(academicResources.subjectId, subjectId),
          eq(academicResources.collegeId, collegeId),
          eq(academicResources.status, 'APPROVED'),
          isNull(academicResources.deletedAt)
        )
      )
      .orderBy(desc(academicResources.createdAt));

    return rows as AcademicResourceEntity[];
  }

  public async listForModeration(collegeId: string): Promise<AcademicResourceEntity[]> {
    const rows = await this.db
      .select()
      .from(academicResources)
      .where(
        and(
          eq(academicResources.collegeId, collegeId),
          inArray(academicResources.status, ['PENDING', 'QUARANTINED']),
          isNull(academicResources.deletedAt)
        )
      )
      .orderBy(desc(academicResources.createdAt));

    return rows as AcademicResourceEntity[];
  }

  public async save(resource: AcademicResourceEntity): Promise<AcademicResourceEntity> {
    const existing = await this.db
      .select({ id: academicResources.id })
      .from(academicResources)
      .where(eq(academicResources.id, resource.id))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(academicResources)
        .set({
          title: resource.title,
          slug: resource.slug,
          description: resource.description ?? null,
          status: resource.status,
          verificationStatus: resource.verificationStatus,
          currentVersionId: resource.currentVersionId ?? null,
          updatedAt: new Date()
        })
        .where(eq(academicResources.id, resource.id));
    } else {
      await this.db.insert(academicResources).values({
        id: resource.id,
        collegeId: resource.collegeId,
        departmentId: resource.departmentId,
        subjectId: resource.subjectId,
        courseId: resource.courseId ?? null,
        schemeId: resource.schemeId ?? null,
        examTypeId: resource.examTypeId ?? null,
        resourceTypeId: resource.resourceTypeId,
        uploaderUserId: resource.uploaderUserId,
        title: resource.title,
        slug: resource.slug,
        description: resource.description ?? null,
        academicYear: resource.academicYear,
        semesterNumber: resource.semesterNumber,
        isAnonymous: resource.isAnonymous,
        authorDisplayName: resource.authorDisplayName ?? null,
        status: resource.status,
        verificationStatus: resource.verificationStatus,
        currentVersionId: resource.currentVersionId ?? null
      });
    }

    return (await this.findById(resource.id, resource.collegeId))!;
  }

  public async delete(id: string, collegeId: string): Promise<boolean> {
    await this.db
      .update(academicResources)
      .set({ deletedAt: new Date() })
      .where(and(eq(academicResources.id, id), eq(academicResources.collegeId, collegeId)));

    return true;
  }
}

export class DrizzleResourceVersionRepository implements ResourceVersionRepository {
  constructor(private db: NodePgDatabase<any>) {}

  public async findById(id: string): Promise<ResourceVersionEntity | null> {
    const rows = await this.db.select().from(resourceVersions).where(eq(resourceVersions.id, id)).limit(1);
    return (rows[0] as ResourceVersionEntity) || null;
  }

  public async findByResourceId(resourceId: string): Promise<ResourceVersionEntity[]> {
    const rows = await this.db
      .select()
      .from(resourceVersions)
      .where(eq(resourceVersions.resourceId, resourceId))
      .orderBy(desc(resourceVersions.versionNumber));
    return rows as ResourceVersionEntity[];
  }

  public async findLatestVersionNumber(resourceId: string): Promise<number> {
    const rows = await this.db
      .select({ versionNumber: resourceVersions.versionNumber })
      .from(resourceVersions)
      .where(eq(resourceVersions.resourceId, resourceId))
      .orderBy(desc(resourceVersions.versionNumber))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0].versionNumber : 0;
  }

  public async save(version: ResourceVersionEntity): Promise<ResourceVersionEntity> {
    await this.db.insert(resourceVersions).values({
      id: version.id,
      resourceId: version.resourceId,
      versionNumber: version.versionNumber,
      changelogNotes: version.changelogNotes ?? null,
      createdByUserId: version.createdByUserId
    });
    return (await this.findById(version.id))!;
  }
}

export class DrizzleStudyCollectionRepository implements StudyCollectionRepository {
  constructor(private db: NodePgDatabase<any>) {}

  public async findById(id: string, collegeId: string): Promise<StudyCollectionEntity | null> {
    const rows = await this.db
      .select()
      .from(studyCollections)
      .where(
        and(eq(studyCollections.id, id), eq(studyCollections.collegeId, collegeId), isNull(studyCollections.deletedAt))
      )
      .limit(1);

    return (rows[0] as StudyCollectionEntity) || null;
  }

  public async findByOwner(ownerUserId: string, collegeId: string): Promise<StudyCollectionEntity[]> {
    const rows = await this.db
      .select()
      .from(studyCollections)
      .where(
        and(
          eq(studyCollections.ownerUserId, ownerUserId),
          eq(studyCollections.collegeId, collegeId),
          isNull(studyCollections.deletedAt)
        )
      )
      .orderBy(desc(studyCollections.createdAt));

    return rows as StudyCollectionEntity[];
  }

  public async save(collection: StudyCollectionEntity): Promise<StudyCollectionEntity> {
    const existing = await this.findById(collection.id, collection.collegeId);
    if (existing) {
      await this.db
        .update(studyCollections)
        .set({
          title: collection.title,
          description: collection.description ?? null,
          isPublic: collection.isPublic,
          updatedAt: new Date()
        })
        .where(eq(studyCollections.id, collection.id));
    } else {
      await this.db.insert(studyCollections).values({
        id: collection.id,
        collegeId: collection.collegeId,
        ownerUserId: collection.ownerUserId,
        title: collection.title,
        description: collection.description ?? null,
        isPublic: collection.isPublic
      });
    }
    return (await this.findById(collection.id, collection.collegeId))!;
  }

  public async addResourceToCollection(collectionId: string, resourceId: string, positionOrder: number): Promise<void> {
    await this.db.insert(collectionResources).values({
      collectionId,
      resourceId,
      positionOrder
    });
  }

  public async countCollectionResources(collectionId: string): Promise<number> {
    const rows = await this.db
      .select()
      .from(collectionResources)
      .where(eq(collectionResources.collectionId, collectionId));
    return rows.length;
  }
}

export class DrizzleContributorRepository implements ContributorRepository {
  constructor(private db: NodePgDatabase<any>) {}

  public async findByUser(userId: string, collegeId: string): Promise<ContributorEntity | null> {
    const rows = await this.db
      .select()
      .from(contributors)
      .where(and(eq(contributors.userId, userId), eq(contributors.collegeId, collegeId)))
      .limit(1);

    return (rows[0] as ContributorEntity) || null;
  }

  public async save(contributor: ContributorEntity): Promise<ContributorEntity> {
    const existing = await this.findByUser(contributor.userId, contributor.collegeId);
    if (existing) {
      await this.db
        .update(contributors)
        .set({
          reputationScore: contributor.reputationScore,
          totalUploads: contributor.totalUploads,
          totalHelpfulVotesReceived: contributor.totalHelpfulVotesReceived,
          badgeLevel: contributor.badgeLevel,
          updatedAt: new Date()
        })
        .where(eq(contributors.id, contributor.id));
    } else {
      await this.db.insert(contributors).values({
        id: contributor.id,
        collegeId: contributor.collegeId,
        userId: contributor.userId,
        reputationScore: contributor.reputationScore,
        totalUploads: contributor.totalUploads,
        totalHelpfulVotesReceived: contributor.totalHelpfulVotesReceived,
        badgeLevel: contributor.badgeLevel
      });
    }
    return (await this.findByUser(contributor.userId, contributor.collegeId))!;
  }
}

export class DrizzleStatisticsRepository implements StatisticsRepository {
  constructor(private db: NodePgDatabase<any>) {}

  public async findByResourceId(resourceId: string, collegeId: string): Promise<ResourceStatisticsEntity | null> {
    const rows = await this.db
      .select()
      .from(resourceStatistics)
      .where(and(eq(resourceStatistics.resourceId, resourceId), eq(resourceStatistics.collegeId, collegeId)))
      .limit(1);

    if (rows.length === 0 || !rows[0]) return null;
    const r = rows[0];
    return {
      resourceId: r.resourceId,
      collegeId: r.collegeId,
      totalDownloads: r.totalDownloads,
      totalViews: r.totalViews,
      helpfulVotes: r.helpfulVotes,
      unhelpfulVotes: r.unhelpfulVotes,
      reportCount: r.reportCount,
      bookmarkCount: r.bookmarkCount,
      bayesianQualityScore: Number(r.bayesianQualityScore),
      lastCalculatedAt: r.lastCalculatedAt
    };
  }

  public async save(stats: ResourceStatisticsEntity): Promise<ResourceStatisticsEntity> {
    const existing = await this.findByResourceId(stats.resourceId, stats.collegeId);
    if (existing) {
      await this.db
        .update(resourceStatistics)
        .set({
          totalDownloads: stats.totalDownloads,
          totalViews: stats.totalViews,
          helpfulVotes: stats.helpfulVotes,
          unhelpfulVotes: stats.unhelpfulVotes,
          reportCount: stats.reportCount,
          bookmarkCount: stats.bookmarkCount,
          bayesianQualityScore: stats.bayesianQualityScore.toFixed(2),
          lastCalculatedAt: new Date()
        })
        .where(eq(resourceStatistics.resourceId, stats.resourceId));
    } else {
      await this.db.insert(resourceStatistics).values({
        resourceId: stats.resourceId,
        collegeId: stats.collegeId,
        totalDownloads: stats.totalDownloads,
        totalViews: stats.totalViews,
        helpfulVotes: stats.helpfulVotes,
        unhelpfulVotes: stats.unhelpfulVotes,
        reportCount: stats.reportCount,
        bookmarkCount: stats.bookmarkCount,
        bayesianQualityScore: stats.bayesianQualityScore.toFixed(2)
      });
    }
    return (await this.findByResourceId(stats.resourceId, stats.collegeId))!;
  }
}

export class DrizzleStorageMetadataRepository implements StorageMetadataRepository {
  constructor(private db: NodePgDatabase<any>) {}

  public async findFileByHash(sha256Hash: string): Promise<ResourceFileEntity | null> {
    const rows = await this.db.select().from(resourceFiles).where(eq(resourceFiles.sha256Hash, sha256Hash)).limit(1);
    return (rows[0] as ResourceFileEntity) || null;
  }

  public async saveFile(file: ResourceFileEntity): Promise<ResourceFileEntity> {
    await this.db.insert(resourceFiles).values({
      id: file.id,
      versionId: file.versionId,
      storageProvider: file.storageProvider,
      storageKey: file.storageKey,
      fileName: file.fileName,
      fileSizeBytes: file.fileSizeBytes,
      mimeType: file.mimeType,
      sha256Hash: file.sha256Hash,
      pageCount: file.pageCount ?? null,
      hasPreview: file.hasPreview,
      virusScanStatus: file.virusScanStatus
    });
    const rows = await this.db.select().from(resourceFiles).where(eq(resourceFiles.id, file.id)).limit(1);
    return rows[0] as ResourceFileEntity;
  }
}
