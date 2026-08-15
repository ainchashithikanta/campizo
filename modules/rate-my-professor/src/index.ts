import type { FastifyInstance } from 'fastify';
import type { PlatformModule, ModuleManifest, ModuleHealth, EventBus } from '@college-hub/core';
import { logger } from '@college-hub/logger';
import {
  SearchProfessorsUseCase,
  GetProfessorProfileUseCase,
  GetProfessorStatisticsUseCase,
  GetReviewsUseCase,
  SubmitReviewUseCase,
  EditReviewUseCase,
  DeleteReviewUseCase,
  VoteHelpfulUseCase,
  RemoveVoteUseCase,
  ReportReviewUseCase,
  AddFacultyResponseUseCase,
  UpdateFacultyResponseUseCase,
  ModerateReviewUseCase,
  GetReviewModerationQueueUseCase,
  ListDepartmentsUseCase,
  AdminCreateProfessorUseCase,
  AdminUpdateProfessorUseCase,
  AdminDeleteProfessorUseCase,
  ProfessorRepository,
  ReviewRepository,
  ProfessorStatisticsRepository,
  DepartmentRepository,
  ProfessorEntity,
  ReviewEntity,
  ProfessorStatisticsEntity,
  DepartmentEntity
} from './index.js';
import { registerProfessorRoutes } from './controllers/professor.controller.js';
import { NITK_DEPARTMENTS, NITK_PROFESSORS } from './data/nitk-faculty.js';
import { StatsEngineWorker } from './workers/stats-engine.worker.js';
import { SearchIndexerWorker } from './workers/search-indexer.worker.js';
import { CacheInvalidationWorker } from './workers/cache-invalidation.worker.js';
import { ModerationQueueWorker } from './workers/moderation-queue.worker.js';
import { RateMyProfessorEventRouter } from './workers/event-router.js';

export * from './schema/rate-my-professor.schema.js';
export * from './domain/events.js';
export * from './domain/invariants.js';
export * from './domain/repository.interface.js';
export * from './errors/application-errors.js';
export * from './data/nitk-faculty.js';
export * from './repositories/drizzle-professors.repository.js';
export * from './repositories/drizzle-reviews.repository.js';
export * from './repositories/drizzle-statistics.repository.js';
export * from './use-cases/professor.use-cases.js';
export * from './use-cases/review.use-cases.js';
export * from './use-cases/vote-report.use-cases.js';
export * from './use-cases/faculty.use-cases.js';
export * from './controllers/professor.controller.js';
export * from './workers/dlq-manager.js';
export * from './workers/stats-engine.worker.js';
export * from './workers/search-indexer.worker.js';
export * from './workers/cache-invalidation.worker.js';
export * from './workers/moderation-queue.worker.js';
export * from './workers/event-router.js';

class InMemoryProfessorRepo implements ProfessorRepository {
  private profs = new Map<string, ProfessorEntity>();

  constructor() {
    this.profs.set('prof-101', {
      id: 'prof-101',
      collegeId: 'college-stanford-001',
      departmentId: 'dept-cs-001',
      fullName: 'Dr. Alan Turing',
      slug: 'dr-alan-turing',
      designation: 'Professor',
      status: 'ACTIVE',
      biography: 'Pioneer of theoretical computer science and artificial intelligence.'
    });
  }

  public async findById(id: string, collegeId: string): Promise<ProfessorEntity | null> {
    const p = this.profs.get(id);
    return p && p.collegeId === collegeId ? p : null;
  }

  public async findBySlug(slug: string, collegeId: string): Promise<ProfessorEntity | null> {
    for (const p of this.profs.values()) {
      if (p.slug === slug && p.collegeId === collegeId) return p;
    }
    return null;
  }

  public async search(collegeId: string, query?: string, departmentId?: string): Promise<ProfessorEntity[]> {
    const list = Array.from(this.profs.values()).filter((p) => p.collegeId === collegeId);
    return list.filter(
      (p) =>
        (!query || p.fullName.toLowerCase().includes(query.toLowerCase())) &&
        (!departmentId || p.departmentId === departmentId)
    );
  }

  public async save(professor: ProfessorEntity): Promise<ProfessorEntity> {
    this.profs.set(professor.id, professor);
    return professor;
  }

  public async delete(id: string, collegeId: string): Promise<boolean> {
    const p = this.profs.get(id);
    if (!p || p.collegeId !== collegeId) return false;
    this.profs.delete(id);
    return true;
  }
}

class InMemoryDepartmentRepo implements DepartmentRepository {
  private departments = new Map<string, DepartmentEntity>();

  constructor() {
    this.departments.set('dept-cs-001', {
      id: 'dept-cs-001',
      collegeId: 'college-stanford-001',
      name: 'Computer Science & Engineering',
      shortName: 'CSE'
    });
  }

  public async list(collegeId: string): Promise<DepartmentEntity[]> {
    return Array.from(this.departments.values()).filter((d) => d.collegeId === collegeId);
  }

  public async findById(id: string, collegeId: string): Promise<DepartmentEntity | null> {
    const d = this.departments.get(id);
    return d && d.collegeId === collegeId ? d : null;
  }

  public async save(department: DepartmentEntity): Promise<DepartmentEntity> {
    this.departments.set(department.id, department);
    return department;
  }
}

class InMemoryReviewRepo implements ReviewRepository {
  private reviews = new Map<string, ReviewEntity>();

  public async findById(id: string, collegeId: string): Promise<ReviewEntity | null> {
    const r = this.reviews.get(id);
    return r && r.collegeId === collegeId ? r : null;
  }

  public async findAlreadyReviewed(
    authorUserId: string,
    professorId: string,
    courseAssignmentId: string,
    collegeId: string
  ): Promise<boolean> {
    for (const r of this.reviews.values()) {
      if (
        r.collegeId === collegeId &&
        r.professorId === professorId &&
        r.authorUserId === authorUserId &&
        r.courseAssignmentId === courseAssignmentId
      ) {
        return true;
      }
    }
    return false;
  }

  public async findByProfessorId(professorId: string, collegeId: string): Promise<ReviewEntity[]> {
    return Array.from(this.reviews.values()).filter(
      (r) => r.professorId === professorId && r.collegeId === collegeId && r.moderationStatus === 'APPROVED'
    );
  }

  public async listPendingModeration(collegeId: string): Promise<ReviewEntity[]> {
    return Array.from(this.reviews.values())
      .filter(
        (r) =>
          r.collegeId === collegeId &&
          (r.moderationStatus === 'PENDING_MODERATION' ||
            r.moderationStatus === 'HIDDEN' ||
            r.moderationStatus === 'REJECTED')
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async updateModerationStatus(id: string, collegeId: string, status: string): Promise<void> {
    const r = this.reviews.get(id);
    if (r && r.collegeId === collegeId) {
      r.moderationStatus = status;
    }
  }

  public async save(review: ReviewEntity): Promise<ReviewEntity> {
    this.reviews.set(review.id, review);
    return review;
  }
}

class InMemoryStatsRepo implements ProfessorStatisticsRepository {
  public async findByProfessorId(professorId: string, collegeId: string): Promise<ProfessorStatisticsEntity | null> {
    return {
      professorId,
      collegeId,
      bayesianRating: 4.85,
      rawAverageRating: 4.9,
      totalReviewsCount: 42,
      recommendationPercentage: 92.5,
      star5Count: 35,
      star4Count: 5,
      star3Count: 2,
      star2Count: 0,
      star1Count: 0,
      lastCalculatedAt: new Date()
    };
  }

  public async save(stats: ProfessorStatisticsEntity): Promise<ProfessorStatisticsEntity> {
    return stats;
  }
}

export class RateMyProfessorModule implements PlatformModule {
  public readonly manifest: ModuleManifest = {
    id: 'rate-my-professor',
    name: 'Rate My Professor Module',
    version: '1.0.0',
    minKernelVersion: '1.0.0',
    dependencies: [],
    permissions: ['professors:read', 'professors:write']
  };

  private profRepo: InMemoryProfessorRepo | null = null;
  private reviewRepo: InMemoryReviewRepo | null = null;
  private departmentRepo: InMemoryDepartmentRepo | null = null;

  public initialize(app: FastifyInstance, eventBus: EventBus): void {
    const profRepo = new InMemoryProfessorRepo();
    const reviewRepo = new InMemoryReviewRepo();
    const statsRepo = new InMemoryStatsRepo();
    const departmentRepo = new InMemoryDepartmentRepo();
    this.profRepo = profRepo;
    this.reviewRepo = reviewRepo;
    this.departmentRepo = departmentRepo;

    const searchProfessors = new SearchProfessorsUseCase(profRepo);
    const getProfile = new GetProfessorProfileUseCase(profRepo);
    const getStats = new GetProfessorStatisticsUseCase(statsRepo);
    const getReviews = new GetReviewsUseCase(reviewRepo);
    const submitReview = new SubmitReviewUseCase(reviewRepo, profRepo, eventBus);
    const editReview = new EditReviewUseCase(reviewRepo, eventBus);
    const deleteReview = new DeleteReviewUseCase(reviewRepo, eventBus);
    const voteHelpful = new VoteHelpfulUseCase(reviewRepo, eventBus);
    const removeVote = new RemoveVoteUseCase(reviewRepo, eventBus);
    const reportReview = new ReportReviewUseCase(reviewRepo, eventBus);
    const addFacultyResponse = new AddFacultyResponseUseCase(reviewRepo, eventBus);
    const updateFacultyResponse = new UpdateFacultyResponseUseCase(eventBus);
    const getModerationQueue = new GetReviewModerationQueueUseCase(reviewRepo);
    const moderateReview = new ModerateReviewUseCase(reviewRepo, eventBus);
    const listDepartments = new ListDepartmentsUseCase(departmentRepo);
    const adminCreateProfessor = new AdminCreateProfessorUseCase(profRepo);
    const adminUpdateProfessor = new AdminUpdateProfessorUseCase(profRepo);
    const adminDeleteProfessor = new AdminDeleteProfessorUseCase(profRepo);

    registerProfessorRoutes(app, {
      searchProfessors,
      getProfile,
      getStats,
      getReviews,
      submitReview,
      editReview,
      deleteReview,
      voteHelpful,
      removeVote,
      reportReview,
      addFacultyResponse,
      updateFacultyResponse,
      getModerationQueue,
      moderateReview,
      listDepartments,
      adminCreateProfessor,
      adminUpdateProfessor,
      adminDeleteProfessor
    });

    const statsWorker = new StatsEngineWorker(reviewRepo, statsRepo, eventBus);
    const searchWorker = new SearchIndexerWorker(profRepo);
    const cacheWorker = new CacheInvalidationWorker();
    const modWorker = new ModerationQueueWorker(reviewRepo, eventBus);

    const eventRouter = new RateMyProfessorEventRouter(eventBus, statsWorker, searchWorker, cacheWorker, modWorker);
    eventRouter.registerSubscriptions();

    eventBus.subscribe('USER_REGISTERED', async (event: any) => {
      logger.info({ eventId: event?.eventId }, 'RateMyProfessor module handling user registration event');
    });

    logger.info(`Routes, background workers, and event handlers initialized for module [${this.manifest.id}]`);
  }

  public healthCheck(): ModuleHealth {
    return {
      moduleId: this.manifest.id,
      status: 'ACTIVE',
      healthy: true,
      details: { module: this.manifest.id }
    };
  }

  /**
   * Seeds demo professors and pending-moderation reviews so the admin
   * moderation console has actionable cases. Only called when the API
   * starts with SEED_DEMO_DATA=true. Never seeds secrets or real data.
   */
  public async seedDemoData(collegeId: string): Promise<void> {
    const profRepo = this.profRepo;
    const reviewRepo = this.reviewRepo;
    const departmentRepo = this.departmentRepo;
    if (!profRepo || !reviewRepo || !departmentRepo) return;

    for (const d of NITK_DEPARTMENTS) {
      await departmentRepo.save({ id: d.id, collegeId, name: d.name, shortName: d.shortName });
    }

    const professors: ProfessorEntity[] = NITK_PROFESSORS.map((f, i) => ({
      id: `prof-nitk-${i + 1}`,
      collegeId,
      departmentId: f.departmentId,
      fullName: f.fullName,
      slug: f.slug,
      designation: f.designation,
      status: 'ACTIVE'
    }));
    for (const p of professors) {
      await profRepo.save(p);
    }

    const now = Date.now();
    const pendingReviews: ReviewEntity[] = [
      {
        id: 'rev-nitk-101',
        collegeId,
        professorId: 'prof-nitk-1',
        courseAssignmentId: 'assign-cs-algo-01',
        authorUserId: 'user-seed-101',
        authorAnonymousToken: 'anon-seed-101',
        isAnonymous: true,
        reviewText:
          'Brilliant teacher, but the weekly problem sets are brutal. The grading rubric for the midterm was opaque — hoping the final is kinder. Lectures are worth attending.',
        overallRating: 4,
        moderationStatus: 'PENDING_MODERATION',
        helpfulCount: 12,
        unhelpfulCount: 2,
        createdAt: new Date(now - 3 * 60 * 60 * 1000)
      },
      {
        id: 'rev-nitk-102',
        collegeId,
        professorId: 'prof-nitk-2',
        courseAssignmentId: 'assign-cs-os-01',
        authorUserId: 'user-seed-102',
        authorAnonymousToken: 'anon-seed-102',
        isAnonymous: true,
        reviewText:
          'The labs are genuinely fun but the OS concepts exam went way beyond what was covered in class. Felt unfair. Friendly professor though, office hours are actually helpful.',
        overallRating: 3,
        moderationStatus: 'PENDING_MODERATION',
        helpfulCount: 8,
        unhelpfulCount: 4,
        createdAt: new Date(now - 26 * 60 * 60 * 1000)
      },
      {
        id: 'rev-nitk-103',
        collegeId,
        professorId: 'prof-nitk-22',
        courseAssignmentId: 'assign-ec-vlsi-01',
        authorUserId: 'user-seed-103',
        authorAnonymousToken: 'anon-seed-103',
        isAnonymous: true,
        reviewText:
          'Professor Bhat is the reason I switched into the VLSI track. Deep subject knowledge and he remembers every student by name. Projects are heavy but you learn everything.',
        overallRating: 5,
        moderationStatus: 'PENDING_MODERATION',
        helpfulCount: 21,
        unhelpfulCount: 1,
        createdAt: new Date(now - 2 * 60 * 60 * 1000)
      }
    ];
    for (const r of pendingReviews) {
      await reviewRepo.save(r);
    }

    logger.info(`[seed] seeded ${NITK_DEPARTMENTS.length} departments + ${professors.length} professors + 3 pending reviews for ${collegeId}`);
  }
}

export default RateMyProfessorModule;
