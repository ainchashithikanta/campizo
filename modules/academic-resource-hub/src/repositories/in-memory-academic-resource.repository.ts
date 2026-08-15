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

export class InMemoryAcademicResourceRepository implements AcademicResourceRepository {
  private resources = new Map<string, AcademicResourceEntity>();

  public async findById(id: string, collegeId: string): Promise<AcademicResourceEntity | null> {
    const res = this.resources.get(id);
    return res && res.collegeId === collegeId ? { ...res } : null;
  }

  public async findBySlug(slug: string, collegeId: string): Promise<AcademicResourceEntity | null> {
    for (const res of this.resources.values()) {
      if (res.slug === slug && res.collegeId === collegeId) return { ...res };
    }
    return null;
  }

  public async findBySubject(subjectId: string, collegeId: string): Promise<AcademicResourceEntity[]> {
    return Array.from(this.resources.values()).filter(
      (r) => r.subjectId === subjectId && r.collegeId === collegeId && r.status === 'APPROVED'
    );
  }

  public async listForModeration(collegeId: string): Promise<AcademicResourceEntity[]> {
    return Array.from(this.resources.values()).filter(
      (r) => r.collegeId === collegeId && (r.status === 'PENDING' || r.status === 'QUARANTINED')
    );
  }

  public async save(resource: AcademicResourceEntity): Promise<AcademicResourceEntity> {
    this.resources.set(resource.id, { ...resource });
    return { ...resource };
  }

  public async delete(id: string, collegeId: string): Promise<boolean> {
    const res = this.resources.get(id);
    if (res && res.collegeId === collegeId) {
      this.resources.delete(id);
      return true;
    }
    return false;
  }
}

export class InMemoryResourceVersionRepository implements ResourceVersionRepository {
  private versions = new Map<string, ResourceVersionEntity>();

  public async findById(id: string): Promise<ResourceVersionEntity | null> {
    const v = this.versions.get(id);
    return v ? { ...v } : null;
  }

  public async findByResourceId(resourceId: string): Promise<ResourceVersionEntity[]> {
    return Array.from(this.versions.values())
      .filter((v) => v.resourceId === resourceId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  public async findLatestVersionNumber(resourceId: string): Promise<number> {
    const versions = await this.findByResourceId(resourceId);
    return versions.length > 0 && versions[0] ? versions[0].versionNumber : 0;
  }

  public async save(version: ResourceVersionEntity): Promise<ResourceVersionEntity> {
    this.versions.set(version.id, { ...version });
    return { ...version };
  }
}

export class InMemoryStudyCollectionRepository implements StudyCollectionRepository {
  private collections = new Map<string, StudyCollectionEntity>();
  private items = new Map<string, { collectionId: string; resourceId: string; positionOrder: number }[]>();

  public async findById(id: string, collegeId: string): Promise<StudyCollectionEntity | null> {
    const col = this.collections.get(id);
    return col && col.collegeId === collegeId ? { ...col } : null;
  }

  public async findByOwner(ownerUserId: string, collegeId: string): Promise<StudyCollectionEntity[]> {
    return Array.from(this.collections.values()).filter(
      (c) => c.ownerUserId === ownerUserId && c.collegeId === collegeId
    );
  }

  public async save(collection: StudyCollectionEntity): Promise<StudyCollectionEntity> {
    this.collections.set(collection.id, { ...collection });
    return { ...collection };
  }

  public async addResourceToCollection(collectionId: string, resourceId: string, positionOrder: number): Promise<void> {
    const current = this.items.get(collectionId) || [];
    current.push({ collectionId, resourceId, positionOrder });
    this.items.set(collectionId, current);
  }

  public async countCollectionResources(collectionId: string): Promise<number> {
    const current = this.items.get(collectionId) || [];
    return current.length;
  }
}

export class InMemoryContributorRepository implements ContributorRepository {
  private contributors = new Map<string, ContributorEntity>();

  public async findByUser(userId: string, collegeId: string): Promise<ContributorEntity | null> {
    const key = `${collegeId}:${userId}`;
    const c = this.contributors.get(key);
    return c ? { ...c } : null;
  }

  public async save(contributor: ContributorEntity): Promise<ContributorEntity> {
    const key = `${contributor.collegeId}:${contributor.userId}`;
    this.contributors.set(key, { ...contributor });
    return { ...contributor };
  }
}

export class InMemoryStatisticsRepository implements StatisticsRepository {
  private stats = new Map<string, ResourceStatisticsEntity>();

  public async findByResourceId(resourceId: string, collegeId: string): Promise<ResourceStatisticsEntity | null> {
    const key = `${collegeId}:${resourceId}`;
    const s = this.stats.get(key);
    return s ? { ...s } : null;
  }

  public async save(stats: ResourceStatisticsEntity): Promise<ResourceStatisticsEntity> {
    const key = `${stats.collegeId}:${stats.resourceId}`;
    this.stats.set(key, { ...stats });
    return { ...stats };
  }
}

export class InMemoryStorageMetadataRepository implements StorageMetadataRepository {
  private files = new Map<string, ResourceFileEntity>();
  private hashIndex = new Map<string, ResourceFileEntity>();

  public async findFileByHash(sha256Hash: string): Promise<ResourceFileEntity | null> {
    const f = this.hashIndex.get(sha256Hash);
    return f ? { ...f } : null;
  }

  public async saveFile(file: ResourceFileEntity): Promise<ResourceFileEntity> {
    this.files.set(file.id, { ...file });
    this.hashIndex.set(file.sha256Hash, { ...file });
    return { ...file };
  }
}
