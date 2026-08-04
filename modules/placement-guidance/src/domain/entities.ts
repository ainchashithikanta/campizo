/**
 * Placement Guidance Module — Domain Entities & Types
 */

export interface CompanyEntity {
  id: string;
  collegeId: string;
  name: string;
  slug: string;
  website?: string | null | undefined;
  officialWebsite?: string | null | undefined;
  logoUrl?: string | null | undefined;
  bannerUrl?: string | null | undefined;
  careerUrl?: string | null | undefined;
  glassdoorUrl?: string | null | undefined;
  industry: string;
  tier: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null | undefined;
}

export interface QuestionBankEntity {
  id: string;
  collegeId: string;
  companyId?: string | null | undefined;
  companyName: string;
  roleTitle: string;
  questionText: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  roundType: 'ONLINE_ASSESSMENT' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR';
  jobType: 'INTERNSHIP' | 'FULL_TIME';
  branch: string;
  batchYear: number;
  frequencyCount: number;
  helpfulCount: number;
  reportsCount: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null | undefined;
}

export interface QuestionFilterParams {
  collegeId: string;
  companyName?: string | undefined;
  topic?: string | undefined;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | undefined;
  roleTitle?: string | undefined;
  jobType?: 'INTERNSHIP' | 'FULL_TIME' | undefined;
  branch?: string | undefined;
  batchYear?: number | undefined;
  query?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface DiscussionThreadEntity {
  id: string;
  collegeId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  topic: string;
  companySlug?: string | null | undefined;
  upvotesCount: number;
  downvotesCount: number;
  repliesCount: number;
  viewsCount: number;
  acceptedReplyId?: string | null | undefined;
  status: 'ACTIVE' | 'CLOSED' | 'FLAGGED';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null | undefined;
  replies?: DiscussionReplyEntity[] | undefined;
}

export interface DiscussionReplyEntity {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  content: string;
  upvotesCount: number;
  downvotesCount: number;
  isAcceptedAnswer: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null | undefined;
}

export interface DiscussionFilterParams {
  collegeId: string;
  topic?: string | undefined;
  companySlug?: string | undefined;
  query?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface CompanyStatisticsCacheEntity {
  id: string;
  collegeId: string;
  companyId: string;
  interviewCount: number;
  avgCtcLpa: number;
  highestCtcLpa: number;
  avgDifficulty: number;
  internshipCount: number;
  fullTimeCount: number;
  mostCommonTopics: string[];
  lastComputedAt: Date;
}

export interface AdminRoadmapEntity {
  id: string;
  collegeId: string;
  title: string;
  description: string;
  steps: Array<{
    order: number;
    topic: string;
    description: string;
    recommendedProblemsCount: number;
  }>;
  updatedAt: Date;
}

export interface InterviewQuestionEntity {
  id: string;
  roundId: string;
  questionText: string;
  questionCategory: 'ALGORITHMS' | 'SYSTEM_DESIGN' | 'BEHAVIORAL' | 'LANGUAGE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  createdAt: Date;
}

export interface InterviewRoundEntity {
  id: string;
  experienceId: string;
  roundNumber: number;
  roundName: string;
  roundType: 'ONLINE_ASSESSMENT' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR';
  durationMinutes: number;
  description: string;
  topicsCovered: string[];
  questions?: InterviewQuestionEntity[] | undefined;
  createdAt: Date;
}

export interface PlacementExperienceEntity {
  id: string;
  collegeId: string;
  companyId: string;
  authorId: string;
  roleTitle: string;
  jobType: 'INTERNSHIP' | 'FULL_TIME';
  branch: string;
  cgpa: number;
  ctcOfferedLpa?: number | null | undefined;
  stipendMonthly?: number | null | undefined;
  offerStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  difficultyRating: number;
  overallRating: number;
  summary: string;
  preparationTips?: string | null | undefined;
  versionNumber: number;
  helpfulCount: number;
  reportsCount: number;
  isAnonymous: boolean;
  status: 'APPROVED' | 'PENDING' | 'FLAGGED';
  vectorEmbedding?: number[] | null | undefined;
  rounds?: InterviewRoundEntity[] | undefined;
  companyName?: string | undefined;
  companySlug?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null | undefined;
}

export interface ExperienceVersionEntity {
  id: string;
  experienceId: string;
  versionNumber: number;
  roleTitle: string;
  jobType: 'INTERNSHIP' | 'FULL_TIME';
  branch: string;
  cgpa: number;
  ctcOfferedLpa?: number | null | undefined;
  summary: string;
  preparationTips?: string | null | undefined;
  createdById: string;
  createdAt: Date;
}

export interface CompanyAISummaryEntity {
  id: string;
  collegeId: string;
  companyId: string;
  companySummary: string;
  topTopics: string[];
  difficultyDistribution: Record<string, number>;
  salaryDistribution: Record<string, number>;
  lastGeneratedAt: Date;
}

export interface PlacementBookmarkEntity {
  id: string;
  collegeId: string;
  studentProfileId: string;
  targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD';
  targetId: string;
  createdAt: Date;
}

export interface PlacementAnalyticsEntity {
  id: string;
  collegeId: string;
  eventType: 'COMPANY_SEARCH' | 'EXPERIENCE_VIEW' | 'COMPANY_BOOKMARK' | 'HELPFUL_VOTE';
  targetId: string;
  studentProfileId: string;
  recordedAt: Date;
}

export interface SalaryInsightEntity {
  id: string;
  collegeId: string;
  companyId: string;
  roleTitle: string;
  batchYear: number;
  avgCtcLpa: number;
  minCtcLpa: number;
  maxCtcLpa: number;
  sampleSize: number;
  updatedAt: Date;
}

export interface PlacementFilterParams {
  collegeId: string;
  companySlug?: string | undefined;
  roleTitle?: string | undefined;
  jobType?: 'INTERNSHIP' | 'FULL_TIME' | undefined;
  branch?: string | undefined;
  minCgpa?: number | undefined;
  minPackageLpa?: number | undefined;
  difficulty?: number | undefined;
  topic?: string | undefined;
  query?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}
