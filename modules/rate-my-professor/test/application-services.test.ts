import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EventBus } from '@college-hub/core';
import type { ProfessorRepository, ReviewRepository, ProfessorEntity, ReviewEntity } from '../src/index.js';
import {
  SubmitReviewUseCase,
  EditReviewUseCase,
  VoteHelpfulUseCase,
  AddFacultyResponseUseCase,
  DuplicateReviewError,
  EditWindowExpiredError
} from '../src/index.js';

class InMemoryProfessorRepository implements ProfessorRepository {
  private profs = new Map<string, ProfessorEntity>();

  public async findById(id: string, collegeId: string): Promise<ProfessorEntity | null> {
    const prof = this.profs.get(id);
    return prof && prof.collegeId === collegeId ? prof : null;
  }

  public async findBySlug(slug: string, collegeId: string): Promise<ProfessorEntity | null> {
    for (const p of this.profs.values()) {
      if (p.slug === slug && p.collegeId === collegeId) return p;
    }
    return null;
  }

  public async save(professor: ProfessorEntity): Promise<ProfessorEntity> {
    this.profs.set(professor.id, professor);
    return professor;
  }
}

class InMemoryReviewRepository implements ReviewRepository {
  private reviews = new Map<string, ReviewEntity>();

  public async findById(id: string, collegeId: string): Promise<ReviewEntity | null> {
    const rev = this.reviews.get(id);
    return rev && rev.collegeId === collegeId ? rev : null;
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

  public async save(review: ReviewEntity): Promise<ReviewEntity> {
    this.reviews.set(review.id, review);
    return review;
  }
}

describe('Rate My Professor — Application Services & Use Cases (MS-18.8.2)', () => {
  let profRepo: InMemoryProfessorRepository;
  let reviewRepo: InMemoryReviewRepository;
  let mockEventBus: EventBus;

  beforeEach(() => {
    profRepo = new InMemoryProfessorRepository();
    reviewRepo = new InMemoryReviewRepository();
    mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    };

    profRepo.save({
      id: 'prof-101',
      collegeId: 'stanford-1',
      departmentId: 'dept-cse',
      fullName: 'Dr. Alan Turing',
      slug: 'dr-alan-turing',
      designation: 'Professor',
      status: 'ACTIVE'
    });
  });

  it('should successfully submit review and publish ReviewCreated & ReviewPublished events', async () => {
    const useCase = new SubmitReviewUseCase(reviewRepo, profRepo, mockEventBus);

    const review = await useCase.execute({
      collegeId: 'stanford-1',
      professorId: 'prof-101',
      courseAssignmentId: 'assign-cs101',
      authorUserId: 'usr-student-1',
      authorAnonymousToken: 'hmac-anon-token-123',
      reviewText: 'Excellent lecturer with great insight into computation.',
      overallRating: 4.8
    });

    expect(review.id).toBeDefined();
    expect(review.overallRating).toBe(4.8);
    expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    expect(mockEventBus.publish).toHaveBeenCalledWith('ReviewCreated', expect.anything());
    expect(mockEventBus.publish).toHaveBeenCalledWith('ReviewPublished', expect.anything());
  });

  it('should throw DuplicateReviewError when submitting duplicate review for same term', async () => {
    const useCase = new SubmitReviewUseCase(reviewRepo, profRepo, mockEventBus);

    await useCase.execute({
      collegeId: 'stanford-1',
      professorId: 'prof-101',
      courseAssignmentId: 'assign-cs101',
      authorUserId: 'usr-student-1',
      authorAnonymousToken: 'hmac-anon-token-123',
      reviewText: 'First review text.',
      overallRating: 4.5
    });

    await expect(
      useCase.execute({
        collegeId: 'stanford-1',
        professorId: 'prof-101',
        courseAssignmentId: 'assign-cs101',
        authorUserId: 'usr-student-1',
        authorAnonymousToken: 'hmac-anon-token-123',
        reviewText: 'Duplicate review text.',
        overallRating: 4.0
      })
    ).rejects.toThrow(DuplicateReviewError);
  });

  it('should throw EditWindowExpiredError when editing review after 24 hours', async () => {
    const submitUseCase = new SubmitReviewUseCase(reviewRepo, profRepo, mockEventBus);
    const editUseCase = new EditReviewUseCase(reviewRepo, mockEventBus);

    const review = await submitUseCase.execute({
      collegeId: 'stanford-1',
      professorId: 'prof-101',
      courseAssignmentId: 'assign-cs101',
      authorUserId: 'usr-student-1',
      authorAnonymousToken: 'hmac-anon-token-123',
      reviewText: 'Initial review text.',
      overallRating: 4.5
    });

    review.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await reviewRepo.save(review);

    await expect(
      editUseCase.execute({
        reviewId: review.id,
        authorUserId: 'usr-student-1',
        collegeId: 'stanford-1',
        newReviewText: 'Updated review text.',
        newOverallRating: 5.0
      })
    ).rejects.toThrow(EditWindowExpiredError);
  });

  it('should process helpful vote and publish ReviewVoteAdded event', async () => {
    const submitUseCase = new SubmitReviewUseCase(reviewRepo, profRepo, mockEventBus);
    const voteUseCase = new VoteHelpfulUseCase(reviewRepo, mockEventBus);

    const review = await submitUseCase.execute({
      collegeId: 'stanford-1',
      professorId: 'prof-101',
      courseAssignmentId: 'assign-cs101',
      authorUserId: 'usr-student-1',
      authorAnonymousToken: 'hmac-anon-token-123',
      reviewText: 'Initial review text.',
      overallRating: 4.5
    });

    await voteUseCase.execute({
      reviewId: review.id,
      voterUserId: 'usr-student-2',
      collegeId: 'stanford-1',
      voteType: 'HELPFUL'
    });

    const updated = await reviewRepo.findById(review.id, 'stanford-1');
    expect(updated?.helpfulCount).toBe(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'ReviewVoteAdded',
      expect.objectContaining({ eventName: 'ReviewVoteAdded' })
    );
  });

  it('should publish FacultyResponded event when faculty responds', async () => {
    const submitUseCase = new SubmitReviewUseCase(reviewRepo, profRepo, mockEventBus);
    const facultyUseCase = new AddFacultyResponseUseCase(reviewRepo, mockEventBus);

    const review = await submitUseCase.execute({
      collegeId: 'stanford-1',
      professorId: 'prof-101',
      courseAssignmentId: 'assign-cs101',
      authorUserId: 'usr-student-1',
      authorAnonymousToken: 'hmac-anon-token-123',
      reviewText: 'Initial review text.',
      overallRating: 4.5
    });

    const res = await facultyUseCase.execute({
      reviewId: review.id,
      professorUserId: 'usr-prof-101',
      collegeId: 'stanford-1',
      responseText: 'Thank you for your constructive feedback!'
    });

    expect(res.responseId).toBeDefined();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'FacultyResponded',
      expect.objectContaining({ eventName: 'FacultyResponded' })
    );
  });
});
