import type {
  ProfessorRepository,
  ProfessorStatisticsRepository,
  ProfessorEntity,
  ProfessorStatisticsEntity
} from '../domain/repository.interface.js';
import { EntityNotFoundError } from '../errors/application-errors.js';

export class SearchProfessorsUseCase {
  constructor(private readonly professorRepo: ProfessorRepository) {}

  public async execute(params: {
    collegeId: string;
    query?: string;
    departmentId?: string;
  }): Promise<ProfessorEntity[]> {
    return (this.professorRepo as any).search(params.collegeId, params.query, params.departmentId);
  }
}

export class GetProfessorProfileUseCase {
  constructor(private readonly professorRepo: ProfessorRepository) {}

  public async execute(params: { slug: string; collegeId: string }): Promise<ProfessorEntity> {
    const professor = await this.professorRepo.findBySlug(params.slug, params.collegeId);
    if (!professor) {
      throw new EntityNotFoundError('Professor', params.slug);
    }
    return professor;
  }
}

export class GetProfessorStatisticsUseCase {
  constructor(private readonly statsRepo: ProfessorStatisticsRepository) {}

  public async execute(params: { professorId: string; collegeId: string }): Promise<ProfessorStatisticsEntity> {
    const stats = await this.statsRepo.findByProfessorId(params.professorId, params.collegeId);
    if (!stats) {
      // Fallback default statistics for zero-review profile
      return {
        professorId: params.professorId,
        collegeId: params.collegeId,
        bayesianRating: 0.0,
        rawAverageRating: 0.0,
        totalReviewsCount: 0,
        recommendationPercentage: 0.0,
        star5Count: 0,
        star4Count: 0,
        star3Count: 0,
        star2Count: 0,
        star1Count: 0,
        lastCalculatedAt: new Date()
      };
    }
    return stats;
  }
}
