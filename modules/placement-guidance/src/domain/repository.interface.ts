/**
 * Placement Guidance Module — Repository Interfaces
 */

import {
  CompanyEntity,
  PlacementExperienceEntity,
  QuestionBankEntity,
  QuestionFilterParams,
  DiscussionThreadEntity,
  DiscussionReplyEntity,
  DiscussionFilterParams,
  CompanyStatisticsCacheEntity,
  AdminRoadmapEntity,
  ExperienceVersionEntity,
  CompanyAISummaryEntity,
  PlacementBookmarkEntity,
  SalaryInsightEntity,
  PlacementFilterParams
} from './entities.js';

export interface IPlacementRepository {
  // Company Operations
  findCompanyById(id: string, collegeId: string): Promise<CompanyEntity | null>;
  findCompanyBySlug(slug: string, collegeId: string): Promise<CompanyEntity | null>;
  createCompany(
    company: Partial<CompanyEntity> & { id: string; collegeId: string; name: string; slug: string }
  ): Promise<CompanyEntity>;

  // Experience Operations
  createExperience(
    experience: Partial<PlacementExperienceEntity> & {
      id: string;
      collegeId: string;
      companyId: string;
      authorId: string;
      roleTitle: string;
      jobType: 'INTERNSHIP' | 'FULL_TIME';
      branch: string;
      cgpa: number;
      summary: string;
    },
    rounds?: Array<{
      id: string;
      roundNumber: number;
      roundName: string;
      roundType: 'ONLINE_ASSESSMENT' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR';
      durationMinutes: number;
      description: string;
      topicsCovered: string[];
      questions?: Array<{
        id: string;
        questionText: string;
        questionCategory: 'ALGORITHMS' | 'SYSTEM_DESIGN' | 'BEHAVIORAL' | 'LANGUAGE';
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      }>;
    }>
  ): Promise<PlacementExperienceEntity>;

  findExperienceById(id: string, collegeId: string): Promise<PlacementExperienceEntity | null>;
  findExperiences(
    params: PlacementFilterParams
  ): Promise<{ items: PlacementExperienceEntity[]; total: number; hasMore: boolean }>;
  incrementHelpfulCount(id: string, collegeId: string): Promise<PlacementExperienceEntity | null>;
  incrementReportCount(id: string, collegeId: string): Promise<PlacementExperienceEntity | null>;
  updateExperienceStatus(
    id: string,
    collegeId: string,
    status: 'APPROVED' | 'FLAGGED'
  ): Promise<PlacementExperienceEntity | null>;
  softDeleteExperience(id: string, collegeId: string): Promise<boolean>;

  // Question Bank Operations
  createQuestion(question: QuestionBankEntity): Promise<QuestionBankEntity>;
  findQuestionById(id: string, collegeId: string): Promise<QuestionBankEntity | null>;
  findQuestions(
    params: QuestionFilterParams
  ): Promise<{ items: QuestionBankEntity[]; total: number; hasMore: boolean }>;
  incrementQuestionHelpfulCount(id: string, collegeId: string): Promise<QuestionBankEntity | null>;
  incrementQuestionReportCount(id: string, collegeId: string): Promise<QuestionBankEntity | null>;
  resetQuestionReportCount(id: string, collegeId: string): Promise<QuestionBankEntity | null>;
  softDeleteQuestion(id: string, collegeId: string): Promise<boolean>;

  // Community Q&A Operations
  createDiscussionThread(thread: DiscussionThreadEntity): Promise<DiscussionThreadEntity>;
  findDiscussionById(id: string, collegeId: string): Promise<DiscussionThreadEntity | null>;
  findDiscussions(
    params: DiscussionFilterParams
  ): Promise<{ items: DiscussionThreadEntity[]; total: number; hasMore: boolean }>;
  createDiscussionReply(reply: DiscussionReplyEntity): Promise<DiscussionReplyEntity>;
  voteDiscussion(
    id: string,
    collegeId: string,
    direction: 'UPVOTE' | 'DOWNVOTE'
  ): Promise<DiscussionThreadEntity | null>;
  voteReply(id: string, threadId: string, direction: 'UPVOTE' | 'DOWNVOTE'): Promise<DiscussionReplyEntity | null>;

  // Statistics Computation (Pure SQL / Aggregations - NO AI)
  getCompanyStatistics(companyId: string, collegeId: string): Promise<CompanyStatisticsCacheEntity | null>;
  computeCompanyStatistics(companyId: string, collegeId: string): Promise<CompanyStatisticsCacheEntity>;

  // Search History & Roadmaps
  recordSearchQuery(collegeId: string, studentProfileId: string, queryText: string): Promise<void>;
  getPopularSearches(collegeId: string, limit?: number): Promise<string[]>;
  getAdminRoadmaps(collegeId: string): Promise<AdminRoadmapEntity[]>;
  upsertAdminRoadmap(roadmap: AdminRoadmapEntity): Promise<AdminRoadmapEntity>;

  // Experience Versioning
  createExperienceVersion(version: ExperienceVersionEntity): Promise<ExperienceVersionEntity>;
  getExperienceVersions(experienceId: string): Promise<ExperienceVersionEntity[]>;

  // AI Summary Cache
  getCompanyAISummary(companyId: string, collegeId: string): Promise<CompanyAISummaryEntity | null>;
  upsertCompanyAISummary(summary: CompanyAISummaryEntity): Promise<CompanyAISummaryEntity>;

  // Bookmarking Operations
  saveBookmark(bookmark: PlacementBookmarkEntity): Promise<PlacementBookmarkEntity>;
  removeBookmark(
    studentProfileId: string,
    targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD',
    targetId: string,
    collegeId: string
  ): Promise<boolean>;
  getUserBookmarks(studentProfileId: string, collegeId: string): Promise<PlacementBookmarkEntity[]>;

  // Analytics & Trending
  recordAnalyticsEvent(
    collegeId: string,
    eventType: 'COMPANY_SEARCH' | 'EXPERIENCE_VIEW' | 'COMPANY_BOOKMARK' | 'HELPFUL_VOTE',
    targetId: string,
    studentProfileId: string
  ): Promise<void>;
  getTrendingCompanies(
    collegeId: string,
    limit?: number
  ): Promise<Array<{ companyId: string; name: string; slug: string; activityCount: number }>>;

  // Salary Insights Operations
  upsertSalaryInsight(
    insight: Partial<SalaryInsightEntity> & {
      id: string;
      collegeId: string;
      companyId: string;
      roleTitle: string;
      batchYear: number;
      avgCtcLpa: number;
      minCtcLpa: number;
      maxCtcLpa: number;
    }
  ): Promise<SalaryInsightEntity>;
  findSalaryInsights(companyId: string, collegeId: string): Promise<SalaryInsightEntity[]>;
}
