import type {
  AcademicResourceRepository,
  StudyCollectionRepository,
  ContributorRepository,
  StatisticsRepository,
  AcademicResourceEntity,
  StudyCollectionEntity,
  ContributorEntity,
  ResourceStatisticsEntity
} from '../domain/repository.interface.js';
import { ResourceNotFoundError } from '../errors/application-errors.js';

export class SearchResourcesQuery {
  constructor(private resourceRepo: AcademicResourceRepository) {}

  public async execute(collegeId: string, subjectId?: string, query?: string): Promise<AcademicResourceEntity[]> {
    if (subjectId) {
      const list = await this.resourceRepo.findBySubject(subjectId, collegeId);
      if (query) {
        return list.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
      }
      return list;
    }
    return [];
  }
}

export class GetSubjectDashboardQuery {
  constructor(private resourceRepo: AcademicResourceRepository) {}

  public async execute(
    collegeId: string,
    subjectId: string
  ): Promise<{ subjectId: string; materials: AcademicResourceEntity[] }> {
    const materials = await this.resourceRepo.findBySubject(subjectId, collegeId);
    return { subjectId, materials };
  }
}

export class GetSemesterDashboardQuery {
  public async execute(_collegeId: string, semesterNumber: number): Promise<{ semesterNumber: number; count: number }> {
    return { semesterNumber, count: 0 };
  }
}

export class GetResourceDetailQuery {
  constructor(
    private resourceRepo: AcademicResourceRepository,
    private statsRepo: StatisticsRepository
  ) {}

  public async execute(
    resourceId: string,
    collegeId: string
  ): Promise<{ resource: AcademicResourceEntity; stats: ResourceStatisticsEntity | null }> {
    const resource = await this.resourceRepo.findById(resourceId, collegeId);
    if (!resource) {
      throw new ResourceNotFoundError(`Academic resource [${resourceId}] not found.`);
    }

    const stats = await this.statsRepo.findByResourceId(resourceId, collegeId);
    return { resource, stats };
  }
}

export class GetStudyCollectionQuery {
  constructor(private collectionRepo: StudyCollectionRepository) {}

  public async execute(collectionId: string, collegeId: string): Promise<StudyCollectionEntity> {
    const collection = await this.collectionRepo.findById(collectionId, collegeId);
    if (!collection) {
      throw new ResourceNotFoundError(`Study collection [${collectionId}] not found.`);
    }
    return collection;
  }
}

export class GetContributorProfileQuery {
  constructor(private contributorRepo: ContributorRepository) {}

  public async execute(userId: string, collegeId: string): Promise<ContributorEntity | null> {
    return await this.contributorRepo.findByUser(userId, collegeId);
  }
}

export class TrendingResourcesQuery {
  public async execute(_collegeId: string): Promise<AcademicResourceEntity[]> {
    return [];
  }
}

export class RecentDownloadsQuery {
  public async execute(_userId: string, _collegeId: string): Promise<any[]> {
    return [];
  }
}

export class BookmarksQuery {
  public async execute(_userId: string, _collegeId: string): Promise<any[]> {
    return [];
  }
}
