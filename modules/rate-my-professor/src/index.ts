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
  ProfessorRepository,
  ReviewRepository,
  ProfessorStatisticsRepository,
  ProfessorEntity,
  ReviewEntity,
  ProfessorStatisticsEntity
} from './index.js';
import { registerProfessorRoutes } from './controllers/professor.controller.js';
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

  public async search(collegeId: string, query?: string): Promise<ProfessorEntity[]> {
    const list = Array.from(this.profs.values()).filter((p) => p.collegeId === collegeId);
    if (query) {
      return list.filter((p) => p.fullName.toLowerCase().includes(query.toLowerCase()));
    }
    return list;
  }

  public async save(professor: ProfessorEntity): Promise<ProfessorEntity> {
    this.profs.set(professor.id, professor);
    return professor;
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
    return Array.from(this.reviews.values()).filter((r) => r.professorId === professorId && r.collegeId === collegeId);
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

  public initialize(app: FastifyInstance, eventBus: EventBus): void {
    const profRepo = new InMemoryProfessorRepo();
    const reviewRepo = new InMemoryReviewRepo();
    const statsRepo = new InMemoryStatsRepo();

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
      updateFacultyResponse
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
}

export default RateMyProfessorModule;
