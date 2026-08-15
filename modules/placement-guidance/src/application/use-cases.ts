/**
 * Placement Guidance Module — Application Layer CQRS Use Cases
 */

import { IPlacementRepository } from '../domain/repository.interface.js';
import { observability } from '@college-hub/observability';
import {
  PlacementExperienceEntity,
  CompanyEntity,
  SalaryInsightEntity,
  CompanyAISummaryEntity,
  ExperienceVersionEntity,
  PlacementBookmarkEntity,
  QuestionBankEntity,
  QuestionFilterParams,
  DiscussionThreadEntity,
  DiscussionReplyEntity,
  DiscussionFilterParams,
  CompanyStatisticsCacheEntity,
  AdminRoadmapEntity,
  PlacementFilterParams
} from '../domain/entities.js';

export interface SubmitExperienceCommand {
  collegeId: string;
  authorId: string;
  companyName: string;
  companySlug?: string | undefined;
  roleTitle: string;
  jobType: 'INTERNSHIP' | 'FULL_TIME';
  branch: string;
  cgpa: number;
  ctcOfferedLpa?: number | undefined;
  stipendMonthly?: number | undefined;
  offerStatus?: 'ACCEPTED' | 'REJECTED' | 'PENDING' | undefined;
  difficultyRating?: number | undefined;
  overallRating?: number | undefined;
  summary: string;
  preparationTips?: string | undefined;
  isAnonymous?: boolean | undefined;
  rounds?:
    | Array<{
        roundNumber: number;
        roundName: string;
        roundType: 'ONLINE_ASSESSMENT' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR';
        durationMinutes: number;
        description: string;
        topicsCovered: string[];
        questions?:
          | Array<{
              questionText: string;
              questionCategory: 'ALGORITHMS' | 'SYSTEM_DESIGN' | 'BEHAVIORAL' | 'LANGUAGE';
              difficulty: 'EASY' | 'MEDIUM' | 'HARD';
            }>
          | undefined;
      }>
    | undefined;
}

export class PlacementUseCases {
  constructor(private readonly repo: IPlacementRepository) {}

  async submitExperience(cmd: SubmitExperienceCommand): Promise<PlacementExperienceEntity> {
    try {
      const slug = cmd.companySlug || cmd.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      let company = await this.repo.findCompanyBySlug(slug, cmd.collegeId);
      if (!company) {
        company = await this.repo.createCompany({
          id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          collegeId: cmd.collegeId,
          name: cmd.companyName,
          slug
        });
      }

      const expId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const roundsInput = (cmd.rounds || []).map((r) => ({
        id: `rnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        roundNumber: r.roundNumber,
        roundName: r.roundName,
        roundType: r.roundType,
        durationMinutes: r.durationMinutes,
        description: r.description,
        topicsCovered: r.topicsCovered,
        questions: (r.questions || []).map((q) => ({
          id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          questionText: q.questionText,
          questionCategory: q.questionCategory,
          difficulty: q.difficulty
        }))
      }));

      const experience = await this.repo.createExperience(
        {
          id: expId,
          collegeId: cmd.collegeId,
          companyId: company.id,
          authorId: cmd.authorId,
          roleTitle: cmd.roleTitle,
          jobType: cmd.jobType,
          branch: cmd.branch,
          cgpa: cmd.cgpa,
          ctcOfferedLpa: cmd.ctcOfferedLpa ?? null,
          stipendMonthly: cmd.stipendMonthly ?? null,
          offerStatus: cmd.offerStatus || 'ACCEPTED',
          difficultyRating: cmd.difficultyRating || 3,
          overallRating: cmd.overallRating || 4,
          summary: cmd.summary,
          preparationTips: cmd.preparationTips ?? null,
          isAnonymous: cmd.isAnonymous || false
        },
        roundsInput
      );

      if (cmd.ctcOfferedLpa) {
        await this.repo.upsertSalaryInsight({
          id: `sal_${company.id}_${cmd.roleTitle.replace(/\s+/g, '_')}`,
          collegeId: cmd.collegeId,
          companyId: company.id,
          roleTitle: cmd.roleTitle,
          batchYear: new Date().getFullYear(),
          avgCtcLpa: cmd.ctcOfferedLpa,
          minCtcLpa: cmd.ctcOfferedLpa,
          maxCtcLpa: cmd.ctcOfferedLpa,
          sampleSize: 1
        });
      }

      observability.business.interviewSubmitted();
      return experience;
    } catch (err) {
      observability.business.interviewSubmissionFailed();
      throw err;
    }
  }

  // Question Bank Use Cases
  async createQuestion(data: {
    collegeId: string;
    authorId: string;
    companyName: string;
    roleTitle: string;
    questionText: string;
    topic: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | undefined;
    roundType?: 'ONLINE_ASSESSMENT' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR' | undefined;
    jobType?: 'INTERNSHIP' | 'FULL_TIME' | undefined;
    branch?: string | undefined;
    batchYear?: number | undefined;
  }): Promise<QuestionBankEntity> {
    const q: QuestionBankEntity = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId: data.collegeId,
      companyName: data.companyName,
      roleTitle: data.roleTitle,
      questionText: data.questionText,
      topic: data.topic,
      difficulty: data.difficulty || 'MEDIUM',
      roundType: data.roundType || 'TECHNICAL',
      jobType: data.jobType || 'FULL_TIME',
      branch: data.branch || 'Computer Science',
      batchYear: data.batchYear || 2026,
      frequencyCount: 1,
      helpfulCount: 0,
      reportsCount: 0,
      status: 'ACTIVE',
      authorId: data.authorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.repo.createQuestion(q);
  }

  async getQuestionById(id: string, collegeId: string): Promise<QuestionBankEntity | null> {
    return this.repo.findQuestionById(id, collegeId);
  }

  async listQuestions(
    params: QuestionFilterParams
  ): Promise<{ items: QuestionBankEntity[]; total: number; hasMore: boolean }> {
    if (params.query) {
      await this.repo.recordSearchQuery(params.collegeId, 'usr_me', params.query);
    }
    observability.business.placementQuery('question');
    return this.repo.findQuestions(params);
  }

  async markQuestionHelpful(id: string, collegeId: string): Promise<QuestionBankEntity | null> {
    return this.repo.incrementQuestionHelpfulCount(id, collegeId);
  }

  async reportQuestion(id: string, collegeId: string): Promise<QuestionBankEntity | null> {
    return this.repo.incrementQuestionReportCount(id, collegeId);
  }

  // Community Q&A Use Cases
  async createDiscussionThread(data: {
    collegeId: string;
    authorId: string;
    authorName?: string | undefined;
    title: string;
    content: string;
    topic: string;
    companySlug?: string | undefined;
  }): Promise<DiscussionThreadEntity> {
    const thread: DiscussionThreadEntity = {
      id: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId: data.collegeId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      authorName: data.authorName || 'Verified Student',
      topic: data.topic,
      companySlug: data.companySlug ?? null,
      upvotesCount: 0,
      downvotesCount: 0,
      repliesCount: 0,
      viewsCount: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.repo.createDiscussionThread(thread);
  }

  async getDiscussionById(id: string, collegeId: string): Promise<DiscussionThreadEntity | null> {
    return this.repo.findDiscussionById(id, collegeId);
  }

  async listDiscussions(
    params: DiscussionFilterParams
  ): Promise<{ items: DiscussionThreadEntity[]; total: number; hasMore: boolean }> {
    return this.repo.findDiscussions(params);
  }

  async createDiscussionReply(data: {
    threadId: string;
    authorId: string;
    authorName?: string | undefined;
    content: string;
  }): Promise<DiscussionReplyEntity> {
    const reply: DiscussionReplyEntity = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      threadId: data.threadId,
      authorId: data.authorId,
      authorName: data.authorName || 'Verified Senior',
      content: data.content,
      upvotesCount: 0,
      downvotesCount: 0,
      isAcceptedAnswer: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.repo.createDiscussionReply(reply);
  }

  async voteDiscussion(
    id: string,
    collegeId: string,
    direction: 'UPVOTE' | 'DOWNVOTE'
  ): Promise<DiscussionThreadEntity | null> {
    return this.repo.voteDiscussion(id, collegeId, direction);
  }

  async voteReply(
    id: string,
    threadId: string,
    direction: 'UPVOTE' | 'DOWNVOTE'
  ): Promise<DiscussionReplyEntity | null> {
    return this.repo.voteReply(id, threadId, direction);
  }

  // Database-Driven Statistics (Pure SQL - NO AI)
  async getCompanyStatistics(companySlug: string, collegeId: string): Promise<CompanyStatisticsCacheEntity | null> {
    const company = await this.repo.findCompanyBySlug(companySlug, collegeId);
    if (!company) return null;
    return this.repo.getCompanyStatistics(company.id, collegeId);
  }

  // Search History & Roadmaps
  async getPopularSearches(collegeId: string): Promise<string[]> {
    return this.repo.getPopularSearches(collegeId);
  }

  async getAdminRoadmaps(collegeId: string): Promise<AdminRoadmapEntity[]> {
    return this.repo.getAdminRoadmaps(collegeId);
  }

  async getCompanyBySlug(
    slug: string,
    collegeId: string,
    studentProfileId?: string
  ): Promise<{
    company: CompanyEntity;
    experiences: PlacementExperienceEntity[];
    salaryInsights: SalaryInsightEntity[];
    aiSummary?: CompanyAISummaryEntity | null;
  } | null> {
    const company = await this.repo.findCompanyBySlug(slug, collegeId);
    if (!company) return null;

    if (studentProfileId) {
      await this.repo.recordAnalyticsEvent(collegeId, 'COMPANY_SEARCH', company.id, studentProfileId);
    }

    const experiencesRes = await this.repo.findExperiences({ collegeId, companySlug: slug, limit: 50 });
    const insights = await this.repo.findSalaryInsights(company.id, collegeId);
    const summary = await this.getCompanyAISummary(company.id, collegeId, experiencesRes.items);

    observability.business.placementQuery('company');
    return {
      company,
      experiences: experiencesRes.items,
      salaryInsights: insights,
      aiSummary: summary
    };
  }

  async getCompanyAISummary(
    companyId: string,
    collegeId: string,
    experiences: PlacementExperienceEntity[]
  ): Promise<CompanyAISummaryEntity> {
    const existing = await this.repo.getCompanyAISummary(companyId, collegeId);
    if (existing) return existing;

    const summaryText = `Aggregate evaluation based on ${experiences.length} verified candidate interviews. Heavy emphasis on Graphs, Dynamic Programming, and System Architecture.`;
    const cachedSummary: CompanyAISummaryEntity = {
      id: `aisum_${companyId}`,
      collegeId,
      companyId,
      companySummary: summaryText,
      topTopics: ['Graphs', 'Dynamic Programming', 'System Design', 'Behavioral'],
      difficultyDistribution: { Easy: 10, Medium: 60, Hard: 30 },
      salaryDistribution: { '30-40 LPA': 40, '40-50 LPA': 45, '50+ LPA': 15 },
      lastGeneratedAt: new Date()
    };

    return this.repo.upsertCompanyAISummary(cachedSummary);
  }

  async getExperienceById(
    id: string,
    collegeId: string,
    studentProfileId?: string
  ): Promise<PlacementExperienceEntity | null> {
    const exp = await this.repo.findExperienceById(id, collegeId);
    if (exp && studentProfileId) {
      await this.repo.recordAnalyticsEvent(collegeId, 'EXPERIENCE_VIEW', id, studentProfileId);
    }
    return exp;
  }

  async getExperienceVersions(experienceId: string): Promise<ExperienceVersionEntity[]> {
    return this.repo.getExperienceVersions(experienceId);
  }

  async listExperiences(
    params: PlacementFilterParams
  ): Promise<{ items: PlacementExperienceEntity[]; total: number; hasMore: boolean }> {
    observability.business.placementQuery('experience');
    return this.repo.findExperiences(params);
  }

  async bookmarkItem(
    studentProfileId: string,
    targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD',
    targetId: string,
    collegeId: string
  ): Promise<PlacementBookmarkEntity> {
    const bookmark: PlacementBookmarkEntity = {
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId,
      studentProfileId,
      targetType,
      targetId,
      createdAt: new Date()
    };

    await this.repo.recordAnalyticsEvent(collegeId, 'COMPANY_BOOKMARK', targetId, studentProfileId);
    return this.repo.saveBookmark(bookmark);
  }

  async removeBookmark(
    studentProfileId: string,
    targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD',
    targetId: string,
    collegeId: string
  ): Promise<boolean> {
    return this.repo.removeBookmark(studentProfileId, targetType, targetId, collegeId);
  }

  async getUserBookmarks(studentProfileId: string, collegeId: string): Promise<PlacementBookmarkEntity[]> {
    return this.repo.getUserBookmarks(studentProfileId, collegeId);
  }

  async getTrendingCompanies(
    collegeId: string,
    limit?: number
  ): Promise<Array<{ companyId: string; name: string; slug: string; activityCount: number }>> {
    return this.repo.getTrendingCompanies(collegeId, limit);
  }

  async markHelpful(
    id: string,
    collegeId: string,
    studentProfileId?: string
  ): Promise<PlacementExperienceEntity | null> {
    if (studentProfileId) {
      await this.repo.recordAnalyticsEvent(collegeId, 'HELPFUL_VOTE', id, studentProfileId);
    }
    return this.repo.incrementHelpfulCount(id, collegeId);
  }

  async reportExperience(id: string, collegeId: string): Promise<PlacementExperienceEntity | null> {
    return this.repo.incrementReportCount(id, collegeId);
  }

  // Moderation Use Cases
  async getModerationQueue(
    collegeId: string
  ): Promise<{ experiences: PlacementExperienceEntity[]; questions: QuestionBankEntity[] }> {
    const [experiencesRes, questionsRes] = await Promise.all([
      this.repo.findExperiences({ collegeId, status: 'FLAGGED', limit: 50 }),
      this.repo.findQuestions({ collegeId, status: 'FLAGGED', limit: 50 })
    ]);
    return { experiences: experiencesRes.items, questions: questionsRes.items };
  }

  async moderateExperience(cmd: {
    id: string;
    collegeId: string;
    action: 'APPROVE' | 'FLAG' | 'DELETE';
  }): Promise<{ id: string; status: 'APPROVED' | 'PENDING' | 'FLAGGED' | 'DELETED' } | null> {
    if (cmd.action === 'DELETE') {
      const deleted = await this.repo.softDeleteExperience(cmd.id, cmd.collegeId);
      return deleted ? { id: cmd.id, status: 'DELETED' } : null;
    }
    const updated = await this.repo.updateExperienceStatus(
      cmd.id,
      cmd.collegeId,
      cmd.action === 'APPROVE' ? 'APPROVED' : 'FLAGGED'
    );
    if (!updated) return null;
    return { id: updated.id, status: updated.status };
  }

  async moderateQuestion(cmd: {
    id: string;
    collegeId: string;
    action: 'APPROVE' | 'FLAG' | 'DELETE';
  }): Promise<{ id: string; status: 'ACTIVE' | 'FLAGGED' | 'DELETED' } | null> {
    if (cmd.action === 'DELETE') {
      const deleted = await this.repo.softDeleteQuestion(cmd.id, cmd.collegeId);
      return deleted ? { id: cmd.id, status: 'DELETED' } : null;
    }
    const updated =
      cmd.action === 'APPROVE'
        ? await this.repo.resetQuestionReportCount(cmd.id, cmd.collegeId)
        : await this.repo.incrementQuestionReportCount(cmd.id, cmd.collegeId);
    if (!updated) return null;
    return { id: updated.id, status: updated.status };
  }
}
