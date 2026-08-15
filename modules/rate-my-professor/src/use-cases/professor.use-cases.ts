import type {
  ProfessorRepository,
  ProfessorStatisticsRepository,
  DepartmentRepository,
  ProfessorEntity,
  ProfessorStatisticsEntity,
  DepartmentEntity
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

export class ListDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  public async execute(params: { collegeId: string }): Promise<DepartmentEntity[]> {
    return this.departmentRepo.list(params.collegeId);
  }
}

export class AdminCreateProfessorUseCase {
  constructor(private readonly professorRepo: ProfessorRepository) {}

  public async execute(params: {
    collegeId: string;
    departmentId: string;
    fullName: string;
    slug: string;
    designation: string;
    biography?: string;
    officialEmail?: string;
  }): Promise<ProfessorEntity> {
    const existing = await this.professorRepo.findBySlug(params.slug, params.collegeId);
    if (existing) {
      throw new EntityNotFoundError('Duplicate slug', params.slug);
    }
    return this.professorRepo.save({
      id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      collegeId: params.collegeId,
      departmentId: params.departmentId,
      fullName: params.fullName,
      slug: params.slug,
      designation: params.designation,
      status: 'ACTIVE',
      ...(params.biography !== undefined ? { biography: params.biography } : {}),
      ...(params.officialEmail !== undefined ? { officialEmail: params.officialEmail } : {})
    });
  }
}

export class AdminUpdateProfessorUseCase {
  constructor(private readonly professorRepo: ProfessorRepository) {}

  public async execute(params: {
    id: string;
    collegeId: string;
    departmentId?: string;
    fullName?: string;
    slug?: string;
    designation?: string;
    status?: string;
    biography?: string;
    officialEmail?: string;
  }): Promise<ProfessorEntity> {
    const existing = await this.professorRepo.findById(params.id, params.collegeId);
    if (!existing) {
      throw new EntityNotFoundError('Professor', params.id);
    }
    if (params.slug !== undefined && params.slug !== existing.slug) {
      const clash = await this.professorRepo.findBySlug(params.slug, params.collegeId);
      if (clash && clash.id !== params.id) {
        throw new EntityNotFoundError('Duplicate slug', params.slug);
      }
    }
    const updated: ProfessorEntity = {
      ...existing,
      ...(params.departmentId !== undefined ? { departmentId: params.departmentId } : {}),
      ...(params.fullName !== undefined ? { fullName: params.fullName } : {}),
      ...(params.slug !== undefined ? { slug: params.slug } : {}),
      ...(params.designation !== undefined ? { designation: params.designation } : {}),
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.biography !== undefined ? { biography: params.biography } : {}),
      ...(params.officialEmail !== undefined ? { officialEmail: params.officialEmail } : {})
    };
    return this.professorRepo.save(updated);
  }
}

export class AdminDeleteProfessorUseCase {
  constructor(private readonly professorRepo: ProfessorRepository) {}

  public async execute(params: { id: string; collegeId: string }): Promise<boolean> {
    const existing = await this.professorRepo.findById(params.id, params.collegeId);
    if (!existing) {
      throw new EntityNotFoundError('Professor', params.id);
    }
    return this.professorRepo.delete(params.id, params.collegeId);
  }
}
