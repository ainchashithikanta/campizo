export interface DomainEvent<T = unknown> {
  eventId: string;
  eventName: string;
  collegeId: string;
  aggregateId: string;
  timestamp: Date;
  payload: T;
}

export interface ProfessorCreatedPayload {
  professorId: string;
  collegeId: string;
  departmentId: string;
  fullName: string;
  slug: string;
}

export interface ProfessorUpdatedPayload {
  professorId: string;
  collegeId: string;
  status: string;
}

export interface ProfessorMergedPayload {
  sourceProfessorId: string;
  targetProfessorId: string;
  collegeId: string;
}

export interface ReviewCreatedPayload {
  reviewId: string;
  professorId: string;
  collegeId: string;
  authorAnonymousToken: string;
  overallRating: number;
}

export interface ReviewUpdatedPayload {
  reviewId: string;
  professorId: string;
  collegeId: string;
  newOverallRating: number;
}

export interface ReviewDeletedPayload {
  reviewId: string;
  professorId: string;
  collegeId: string;
}

export interface ReviewPublishedPayload {
  reviewId: string;
  professorId: string;
  collegeId: string;
  overallRating: number;
}

export interface ReviewReportedPayload {
  reviewId: string;
  reporterUserId: string;
  reason: string;
  reportCount: number;
}

export interface ReviewVoteAddedPayload {
  reviewId: string;
  voterUserId: string;
  voteType: 'HELPFUL' | 'UNHELPFUL';
}

export interface ReviewVoteRemovedPayload {
  reviewId: string;
  voterUserId: string;
}

export interface FacultyRespondedPayload {
  responseId: string;
  reviewId: string;
  professorId: string;
}

export interface StatisticsUpdatedPayload {
  professorId: string;
  collegeId: string;
  bayesianRating: number;
  totalReviewsCount: number;
}

export interface ModeratorDecisionRecordedPayload {
  reviewId: string;
  moderatorUserId: string;
  action: 'APPROVE' | 'HIDE' | 'REJECT' | 'RESTORE';
}

export interface ReviewHiddenPayload {
  reviewId: string;
  professorId: string;
  collegeId: string;
  reason: string;
}

