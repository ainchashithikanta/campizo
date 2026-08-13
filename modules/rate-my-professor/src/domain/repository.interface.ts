export interface ProfessorEntity {
  id: string;
  collegeId: string;
  departmentId: string;
  fullName: string;
  slug: string;
  designation: string;
  status: string;
  biography?: string | undefined;
  photoUrl?: string | undefined;
}

export interface ReviewEntity {
  id: string;
  collegeId: string;
  professorId: string;
  courseAssignmentId: string;
  authorUserId: string;
  authorAnonymousToken: string;
  isAnonymous: boolean;
  reviewText: string;
  overallRating: number;
  moderationStatus: string;
  helpfulCount: number;
  unhelpfulCount: number;
  dimensions?: Record<string, number> | null;
  createdAt: Date;
}

export interface ProfessorStatisticsEntity {
  professorId: string;
  collegeId: string;
  bayesianRating: number;
  rawAverageRating: number;
  totalReviewsCount: number;
  recommendationPercentage: number;
  star5Count: number;
  star4Count: number;
  star3Count: number;
  star2Count: number;
  star1Count: number;
  lastCalculatedAt: Date;
}

export interface ProfessorRepository {
  findById(id: string, collegeId: string): Promise<ProfessorEntity | null>;
  findBySlug(slug: string, collegeId: string): Promise<ProfessorEntity | null>;
  save(professor: ProfessorEntity): Promise<ProfessorEntity>;
}

export interface ReviewRepository {
  findById(id: string, collegeId: string): Promise<ReviewEntity | null>;
  findByProfessorId(
    professorId: string,
    collegeId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ReviewEntity[]>;
  findAlreadyReviewed(
    authorUserId: string,
    professorId: string,
    courseAssignmentId: string,
    collegeId: string
  ): Promise<boolean>;
  save(review: ReviewEntity): Promise<ReviewEntity>;
  listPendingModeration(collegeId: string): Promise<ReviewEntity[]>;
  updateModerationStatus(id: string, collegeId: string, status: string): Promise<void>;
}

export interface ProfessorStatisticsRepository {
  findByProfessorId(professorId: string, collegeId: string): Promise<ProfessorStatisticsEntity | null>;
  save(stats: ProfessorStatisticsEntity): Promise<ProfessorStatisticsEntity>;
}
