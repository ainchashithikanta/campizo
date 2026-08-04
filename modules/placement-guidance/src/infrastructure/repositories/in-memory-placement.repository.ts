/**
 * Placement Guidance — In-Memory Repository Implementation
 * Fast, deterministic repository for unit testing and local development.
 */

import { IPlacementRepository } from '../../domain/repository.interface.js';
import {
  CompanyEntity,
  PlacementExperienceEntity,
  InterviewRoundEntity,
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
} from '../../domain/entities.js';

export class InMemoryPlacementRepository implements IPlacementRepository {
  public companies: Map<string, CompanyEntity> = new Map();
  public experiences: Map<string, PlacementExperienceEntity> = new Map();
  public versions: Map<string, ExperienceVersionEntity[]> = new Map();
  public aiSummaries: Map<string, CompanyAISummaryEntity> = new Map();
  public bookmarks: Map<string, PlacementBookmarkEntity> = new Map();
  public questionsBank: Map<string, QuestionBankEntity> = new Map();
  public discussions: Map<string, DiscussionThreadEntity> = new Map();
  public replies: Map<string, DiscussionReplyEntity[]> = new Map();
  public statsCache: Map<string, CompanyStatisticsCacheEntity> = new Map();
  public searches: Array<{ collegeId: string; studentProfileId: string; queryText: string; recordedAt: Date }> = [];
  public roadmaps: Map<string, AdminRoadmapEntity> = new Map();
  public analyticsEvents: Array<{
    collegeId: string;
    eventType: string;
    targetId: string;
    studentProfileId: string;
    recordedAt: Date;
  }> = [];
  public salaryInsights: Map<string, SalaryInsightEntity> = new Map();

  constructor() {
    const google: CompanyEntity = {
      id: 'comp_google',
      collegeId: 'college_stanford_001',
      name: 'Google',
      slug: 'google',
      website: 'https://careers.google.com',
      officialWebsite: 'https://google.com',
      logoUrl: 'https://logo.clearbit.com/google.com',
      bannerUrl: 'https://images.unsplash.com/photo-google-campus',
      careerUrl: 'https://careers.google.com',
      glassdoorUrl: 'https://glassdoor.com/google',
      industry: 'Technology',
      tier: 'TIER_1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const microsoft: CompanyEntity = {
      id: 'comp_microsoft',
      collegeId: 'college_stanford_001',
      name: 'Microsoft',
      slug: 'microsoft',
      website: 'https://careers.microsoft.com',
      officialWebsite: 'https://microsoft.com',
      logoUrl: 'https://logo.clearbit.com/microsoft.com',
      bannerUrl: 'https://images.unsplash.com/photo-microsoft-hq',
      careerUrl: 'https://careers.microsoft.com',
      glassdoorUrl: 'https://glassdoor.com/microsoft',
      industry: 'Technology',
      tier: 'TIER_1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.companies.set(`${google.collegeId}:${google.id}`, google);
    this.companies.set(`${google.collegeId}:slug:${google.slug}`, google);
    this.companies.set(`${microsoft.collegeId}:${microsoft.id}`, microsoft);
    this.companies.set(`${microsoft.collegeId}:slug:${microsoft.slug}`, microsoft);

    const exp1: PlacementExperienceEntity = {
      id: 'exp_google_swe_001',
      collegeId: 'college_stanford_001',
      companyId: 'comp_google',
      authorId: 'usr_student_101',
      roleTitle: 'Software Engineer',
      jobType: 'FULL_TIME',
      branch: 'Computer Science',
      cgpa: 3.85,
      ctcOfferedLpa: 45.0,
      stipendMonthly: null,
      offerStatus: 'ACCEPTED',
      difficultyRating: 4,
      overallRating: 5,
      summary: 'Cleared 1 Online Assessment and 3 Technical Interviews focused on Graphs and System Design.',
      preparationTips: 'Focus on LeetCode Medium/Hard graphs and system design basics.',
      versionNumber: 1,
      helpfulCount: 12,
      reportsCount: 0,
      isAnonymous: false,
      status: 'APPROVED',
      companyName: 'Google',
      companySlug: 'google',
      createdAt: new Date(),
      updatedAt: new Date(),
      rounds: [
        {
          id: 'rnd_1',
          experienceId: 'exp_google_swe_001',
          roundNumber: 1,
          roundName: 'Online Assessment',
          roundType: 'ONLINE_ASSESSMENT',
          durationMinutes: 90,
          description: '2 Algorithmic Coding Questions',
          topicsCovered: ['Dynamic Programming', 'Trees'],
          createdAt: new Date(),
          questions: [
            {
              id: 'q_1',
              roundId: 'rnd_1',
              questionText: 'Given a binary tree, find the maximum path sum between any two nodes.',
              questionCategory: 'ALGORITHMS',
              difficulty: 'HARD',
              createdAt: new Date()
            }
          ]
        }
      ]
    };

    this.experiences.set(`${exp1.collegeId}:${exp1.id}`, exp1);

    const q1: QuestionBankEntity = {
      id: 'q_word_ladder_2',
      collegeId: 'college_stanford_001',
      companyId: 'comp_google',
      companyName: 'Google',
      roleTitle: 'Software Engineer',
      questionText: 'Find all shortest transformation sequences from startWord to endWord.',
      topic: 'Graphs',
      difficulty: 'HARD',
      roundType: 'TECHNICAL',
      jobType: 'FULL_TIME',
      branch: 'Computer Science',
      batchYear: 2026,
      frequencyCount: 14,
      helpfulCount: 28,
      reportsCount: 0,
      authorId: 'usr_senior_01',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.questionsBank.set(`${q1.collegeId}:${q1.id}`, q1);

    const disc1: DiscussionThreadEntity = {
      id: 'disc_sys_design_01',
      collegeId: 'college_stanford_001',
      title: 'How to approach Google System Design for L4?',
      content: 'Should I focus more on API design or database sharding strategies?',
      authorId: 'usr_student_99',
      authorName: 'Alex Rivers',
      topic: 'System Design',
      companySlug: 'google',
      upvotesCount: 18,
      downvotesCount: 1,
      repliesCount: 1,
      viewsCount: 140,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: [
        {
          id: 'rep_1',
          threadId: 'disc_sys_design_01',
          authorId: 'usr_senior_01',
          authorName: 'Sarah Chen (Google SDE II)',
          content:
            'Focus heavily on trade-offs! Explain why you chose Cassandra over PostgreSQL for high-write throughput.',
          upvotesCount: 12,
          downvotesCount: 0,
          isAcceptedAnswer: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };
    this.discussions.set(`${disc1.collegeId}:${disc1.id}`, disc1);

    const r1: AdminRoadmapEntity = {
      id: 'rd_swe_2026',
      collegeId: 'college_stanford_001',
      title: 'Complete Software Engineering Placement Preparation Roadmap',
      description: 'Step-by-step master plan curated by senior alumni.',
      steps: [
        {
          order: 1,
          topic: 'Arrays & Strings',
          description: 'Two Pointers, Sliding Window, Prefix Sum',
          recommendedProblemsCount: 25
        },
        {
          order: 2,
          topic: 'Linked Lists',
          description: 'Fast & Slow Pointers, Reversal',
          recommendedProblemsCount: 15
        },
        {
          order: 3,
          topic: 'Trees & Binary Search',
          description: 'DFS/BFS, Lowest Common Ancestor',
          recommendedProblemsCount: 20
        },
        {
          order: 4,
          topic: 'Graphs',
          description: 'Dijkstra, Topological Sort, Disjoint Set Union',
          recommendedProblemsCount: 25
        },
        {
          order: 5,
          topic: 'Dynamic Programming',
          description: 'Knapsack, Subsequences, Grid DP',
          recommendedProblemsCount: 30
        },
        {
          order: 6,
          topic: 'System Design & OS',
          description: 'Cache, Message Queues, Concurrency, Load Balancer',
          recommendedProblemsCount: 10
        }
      ],
      updatedAt: new Date()
    };
    this.roadmaps.set(`${r1.collegeId}:${r1.id}`, r1);
  }

  async findCompanyById(id: string, collegeId: string): Promise<CompanyEntity | null> {
    return this.companies.get(`${collegeId}:${id}`) || null;
  }

  async findCompanyBySlug(slug: string, collegeId: string): Promise<CompanyEntity | null> {
    return this.companies.get(`${collegeId}:slug:${slug}`) || null;
  }

  async createCompany(
    company: Partial<CompanyEntity> & { id: string; collegeId: string; name: string; slug: string }
  ): Promise<CompanyEntity> {
    const entity: CompanyEntity = {
      id: company.id,
      collegeId: company.collegeId,
      name: company.name,
      slug: company.slug,
      website: company.website || null,
      officialWebsite: company.officialWebsite || null,
      logoUrl: company.logoUrl || null,
      bannerUrl: company.bannerUrl || null,
      careerUrl: company.careerUrl || null,
      glassdoorUrl: company.glassdoorUrl || null,
      industry: company.industry || 'Technology',
      tier: company.tier || 'TIER_1',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.companies.set(`${company.collegeId}:${entity.id}`, entity);
    this.companies.set(`${company.collegeId}:slug:${entity.slug}`, entity);
    return entity;
  }

  async createExperience(
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
    roundsInput?: Array<{
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
  ): Promise<PlacementExperienceEntity> {
    const comp = await this.findCompanyById(experience.companyId, experience.collegeId);

    const builtRounds: InterviewRoundEntity[] = (roundsInput || []).map((r) => ({
      id: r.id,
      experienceId: experience.id,
      roundNumber: r.roundNumber,
      roundName: r.roundName,
      roundType: r.roundType,
      durationMinutes: r.durationMinutes,
      description: r.description,
      topicsCovered: r.topicsCovered,
      createdAt: new Date(),
      questions: (r.questions || []).map((q) => ({
        id: q.id,
        roundId: r.id,
        questionText: q.questionText,
        questionCategory: q.questionCategory,
        difficulty: q.difficulty,
        createdAt: new Date()
      }))
    }));

    const entity: PlacementExperienceEntity = {
      id: experience.id,
      collegeId: experience.collegeId,
      companyId: experience.companyId,
      authorId: experience.authorId,
      roleTitle: experience.roleTitle,
      jobType: experience.jobType,
      branch: experience.branch,
      cgpa: Number(experience.cgpa),
      ctcOfferedLpa: experience.ctcOfferedLpa ? Number(experience.ctcOfferedLpa) : null,
      stipendMonthly: experience.stipendMonthly ? Number(experience.stipendMonthly) : null,
      offerStatus: experience.offerStatus || 'ACCEPTED',
      difficultyRating: experience.difficultyRating || 3,
      overallRating: experience.overallRating || 4,
      summary: experience.summary,
      preparationTips: experience.preparationTips || null,
      versionNumber: 1,
      helpfulCount: 0,
      reportsCount: 0,
      isAnonymous: experience.isAnonymous || false,
      status: 'APPROVED',
      companyName: comp?.name || 'Company',
      companySlug: comp?.slug || 'company',
      createdAt: new Date(),
      updatedAt: new Date(),
      rounds: builtRounds
    };

    this.experiences.set(`${entity.collegeId}:${entity.id}`, entity);

    await this.createExperienceVersion({
      id: `ver_${entity.id}_1`,
      experienceId: entity.id,
      versionNumber: 1,
      roleTitle: entity.roleTitle,
      jobType: entity.jobType,
      branch: entity.branch,
      cgpa: entity.cgpa,
      ctcOfferedLpa: entity.ctcOfferedLpa,
      summary: entity.summary,
      preparationTips: entity.preparationTips,
      createdById: entity.authorId,
      createdAt: new Date()
    });

    return entity;
  }

  async findExperienceById(id: string, collegeId: string): Promise<PlacementExperienceEntity | null> {
    const exp = this.experiences.get(`${collegeId}:${id}`);
    if (!exp || exp.deletedAt) return null;
    return exp;
  }

  async findExperiences(
    params: PlacementFilterParams
  ): Promise<{ items: PlacementExperienceEntity[]; total: number; hasMore: boolean }> {
    let list = Array.from(this.experiences.values()).filter((e) => e.collegeId === params.collegeId && !e.deletedAt);

    if (params.companySlug) list = list.filter((e) => e.companySlug === params.companySlug);
    if (params.jobType) list = list.filter((e) => e.jobType === params.jobType);
    if (params.query) {
      const q = params.query.toLowerCase();
      list = list.filter(
        (e) =>
          e.roleTitle.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.companyName?.toLowerCase().includes(q)
      );
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit);

    return { items, total: list.length, hasMore: start + limit < list.length };
  }

  async incrementHelpfulCount(id: string, collegeId: string): Promise<PlacementExperienceEntity | null> {
    const exp = await this.findExperienceById(id, collegeId);
    if (!exp) return null;
    exp.helpfulCount += 1;
    this.experiences.set(`${collegeId}:${id}`, exp);
    return exp;
  }

  async incrementReportCount(id: string, collegeId: string): Promise<PlacementExperienceEntity | null> {
    const exp = await this.findExperienceById(id, collegeId);
    if (!exp) return null;
    exp.reportsCount += 1;
    if (exp.reportsCount >= 3) exp.status = 'FLAGGED';
    this.experiences.set(`${collegeId}:${id}`, exp);
    return exp;
  }

  async softDeleteExperience(id: string, collegeId: string): Promise<boolean> {
    const exp = await this.findExperienceById(id, collegeId);
    if (!exp) return false;
    exp.deletedAt = new Date();
    this.experiences.set(`${collegeId}:${id}`, exp);
    return true;
  }

  async createQuestion(question: QuestionBankEntity): Promise<QuestionBankEntity> {
    this.questionsBank.set(`${question.collegeId}:${question.id}`, question);
    return question;
  }

  async findQuestionById(id: string, collegeId: string): Promise<QuestionBankEntity | null> {
    const q = this.questionsBank.get(`${collegeId}:${id}`);
    if (!q || q.deletedAt) return null;
    return q;
  }

  async findQuestions(
    params: QuestionFilterParams
  ): Promise<{ items: QuestionBankEntity[]; total: number; hasMore: boolean }> {
    let list = Array.from(this.questionsBank.values()).filter((q) => q.collegeId === params.collegeId && !q.deletedAt);

    if (params.companyName)
      list = list.filter((q) => q.companyName.toLowerCase().includes(params.companyName!.toLowerCase()));
    if (params.topic) list = list.filter((q) => q.topic.toLowerCase() === params.topic!.toLowerCase());
    if (params.difficulty) list = list.filter((q) => q.difficulty === params.difficulty);
    if (params.jobType) list = list.filter((q) => q.jobType === params.jobType);
    if (params.query) {
      const qTerm = params.query.toLowerCase();
      list = list.filter(
        (q) =>
          q.questionText.toLowerCase().includes(qTerm) ||
          q.companyName.toLowerCase().includes(qTerm) ||
          q.topic.toLowerCase().includes(qTerm)
      );
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit);

    return { items, total: list.length, hasMore: start + limit < list.length };
  }

  async incrementQuestionHelpfulCount(id: string, collegeId: string): Promise<QuestionBankEntity | null> {
    const q = await this.findQuestionById(id, collegeId);
    if (!q) return null;
    q.helpfulCount += 1;
    this.questionsBank.set(`${collegeId}:${id}`, q);
    return q;
  }

  async incrementQuestionReportCount(id: string, collegeId: string): Promise<QuestionBankEntity | null> {
    const q = await this.findQuestionById(id, collegeId);
    if (!q) return null;
    q.reportsCount += 1;
    this.questionsBank.set(`${collegeId}:${id}`, q);
    return q;
  }

  async createDiscussionThread(thread: DiscussionThreadEntity): Promise<DiscussionThreadEntity> {
    this.discussions.set(`${thread.collegeId}:${thread.id}`, thread);
    return thread;
  }

  async findDiscussionById(id: string, collegeId: string): Promise<DiscussionThreadEntity | null> {
    const d = this.discussions.get(`${collegeId}:${id}`);
    if (!d || d.deletedAt) return null;
    return d;
  }

  async findDiscussions(
    params: DiscussionFilterParams
  ): Promise<{ items: DiscussionThreadEntity[]; total: number; hasMore: boolean }> {
    let list = Array.from(this.discussions.values()).filter((d) => d.collegeId === params.collegeId && !d.deletedAt);

    if (params.topic) list = list.filter((d) => d.topic.toLowerCase() === params.topic!.toLowerCase());
    if (params.companySlug) list = list.filter((d) => d.companySlug === params.companySlug);
    if (params.query) {
      const qTerm = params.query.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(qTerm) || d.content.toLowerCase().includes(qTerm));
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit);

    return { items, total: list.length, hasMore: start + limit < list.length };
  }

  async createDiscussionReply(reply: DiscussionReplyEntity): Promise<DiscussionReplyEntity> {
    const thread = Array.from(this.discussions.values()).find((d) => d.id === reply.threadId);
    if (thread) {
      thread.repliesCount += 1;
      if (!thread.replies) thread.replies = [];
      thread.replies.push(reply);
      this.discussions.set(`${thread.collegeId}:${thread.id}`, thread);
    }
    return reply;
  }

  async voteDiscussion(
    id: string,
    collegeId: string,
    direction: 'UPVOTE' | 'DOWNVOTE'
  ): Promise<DiscussionThreadEntity | null> {
    const thread = await this.findDiscussionById(id, collegeId);
    if (!thread) return null;
    if (direction === 'UPVOTE') thread.upvotesCount += 1;
    else thread.downvotesCount += 1;
    this.discussions.set(`${collegeId}:${id}`, thread);
    return thread;
  }

  async voteReply(
    id: string,
    threadId: string,
    direction: 'UPVOTE' | 'DOWNVOTE'
  ): Promise<DiscussionReplyEntity | null> {
    for (const thread of this.discussions.values()) {
      if (thread.id === threadId && thread.replies) {
        const rep = thread.replies.find((r) => r.id === id);
        if (rep) {
          if (direction === 'UPVOTE') rep.upvotesCount += 1;
          else rep.downvotesCount += 1;
          return rep;
        }
      }
    }
    return null;
  }

  async getCompanyStatistics(companyId: string, collegeId: string): Promise<CompanyStatisticsCacheEntity | null> {
    const cached = this.statsCache.get(`${collegeId}:${companyId}`);
    if (cached) return cached;
    return this.computeCompanyStatistics(companyId, collegeId);
  }

  async computeCompanyStatistics(companyId: string, collegeId: string): Promise<CompanyStatisticsCacheEntity> {
    const exps = Array.from(this.experiences.values()).filter(
      (e) => e.collegeId === collegeId && e.companyId === companyId && !e.deletedAt
    );
    const interviewCount = exps.length;
    const packages = exps.map((e) => e.ctcOfferedLpa || 0).filter((p) => p > 0);
    const avgCtcLpa =
      packages.length > 0 ? Number((packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(2)) : 42.5;
    const highestCtcLpa = packages.length > 0 ? Math.max(...packages) : 58.0;
    const avgDifficulty =
      exps.length > 0 ? Number((exps.reduce((a, b) => a + b.difficultyRating, 0) / exps.length).toFixed(2)) : 3.8;
    const internshipCount = exps.filter((e) => e.jobType === 'INTERNSHIP').length;
    const fullTimeCount = exps.filter((e) => e.jobType === 'FULL_TIME').length;

    const stats: CompanyStatisticsCacheEntity = {
      id: `stat_${companyId}`,
      collegeId,
      companyId,
      interviewCount: Math.max(interviewCount, 12),
      avgCtcLpa,
      highestCtcLpa,
      avgDifficulty,
      internshipCount,
      fullTimeCount,
      mostCommonTopics: ['Graphs', 'Dynamic Programming', 'System Design', 'Trees'],
      lastComputedAt: new Date()
    };

    this.statsCache.set(`${collegeId}:${companyId}`, stats);
    return stats;
  }

  async recordSearchQuery(collegeId: string, studentProfileId: string, queryText: string): Promise<void> {
    this.searches.push({ collegeId, studentProfileId, queryText, recordedAt: new Date() });
  }

  async getPopularSearches(collegeId: string, limit: number = 5): Promise<string[]> {
    const counts: Map<string, number> = new Map();
    for (const s of this.searches) {
      if (s.collegeId === collegeId) {
        counts.set(s.queryText, (counts.get(s.queryText) || 0) + 1);
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
    return sorted.length > 0
      ? sorted.slice(0, limit)
      : ['Google System Design', 'Amazon OA Coding', 'Meta Graphs', 'DP Patterns', 'Behavioral HR'];
  }

  async getAdminRoadmaps(collegeId: string): Promise<AdminRoadmapEntity[]> {
    return Array.from(this.roadmaps.values()).filter((r) => r.collegeId === collegeId);
  }

  async upsertAdminRoadmap(roadmap: AdminRoadmapEntity): Promise<AdminRoadmapEntity> {
    this.roadmaps.set(`${roadmap.collegeId}:${roadmap.id}`, roadmap);
    return roadmap;
  }

  async createExperienceVersion(version: ExperienceVersionEntity): Promise<ExperienceVersionEntity> {
    const list = this.versions.get(version.experienceId) || [];
    list.push(version);
    this.versions.set(version.experienceId, list);
    return version;
  }

  async getExperienceVersions(experienceId: string): Promise<ExperienceVersionEntity[]> {
    return this.versions.get(experienceId) || [];
  }

  async getCompanyAISummary(companyId: string, collegeId: string): Promise<CompanyAISummaryEntity | null> {
    return this.aiSummaries.get(`${collegeId}:${companyId}`) || null;
  }

  async upsertCompanyAISummary(summary: CompanyAISummaryEntity): Promise<CompanyAISummaryEntity> {
    this.aiSummaries.set(`${summary.collegeId}:${summary.companyId}`, summary);
    return summary;
  }

  async saveBookmark(bookmark: PlacementBookmarkEntity): Promise<PlacementBookmarkEntity> {
    const key = `${bookmark.collegeId}:${bookmark.studentProfileId}:${bookmark.targetType}:${bookmark.targetId}`;
    this.bookmarks.set(key, bookmark);
    return bookmark;
  }

  async removeBookmark(
    studentProfileId: string,
    targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD',
    targetId: string,
    collegeId: string
  ): Promise<boolean> {
    const key = `${collegeId}:${studentProfileId}:${targetType}:${targetId}`;
    return this.bookmarks.delete(key);
  }

  async getUserBookmarks(studentProfileId: string, collegeId: string): Promise<PlacementBookmarkEntity[]> {
    return Array.from(this.bookmarks.values()).filter(
      (b) => b.collegeId === collegeId && b.studentProfileId === studentProfileId
    );
  }

  async recordAnalyticsEvent(
    collegeId: string,
    eventType: 'COMPANY_SEARCH' | 'EXPERIENCE_VIEW' | 'COMPANY_BOOKMARK' | 'HELPFUL_VOTE',
    targetId: string,
    studentProfileId: string
  ): Promise<void> {
    this.analyticsEvents.push({ collegeId, eventType, targetId, studentProfileId, recordedAt: new Date() });
  }

  async getTrendingCompanies(
    _collegeId: string,
    _limit?: number
  ): Promise<Array<{ companyId: string; name: string; slug: string; activityCount: number }>> {
    return [
      { companyId: 'comp_google', name: 'Google', slug: 'google', activityCount: 54 },
      { companyId: 'comp_microsoft', name: 'Microsoft', slug: 'microsoft', activityCount: 38 }
    ];
  }

  async upsertSalaryInsight(
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
  ): Promise<SalaryInsightEntity> {
    const key = `${insight.collegeId}:${insight.companyId}:${insight.roleTitle}:${insight.batchYear}`;
    const entity: SalaryInsightEntity = {
      id: insight.id,
      collegeId: insight.collegeId,
      companyId: insight.companyId,
      roleTitle: insight.roleTitle,
      batchYear: insight.batchYear,
      avgCtcLpa: insight.avgCtcLpa,
      minCtcLpa: insight.minCtcLpa,
      maxCtcLpa: insight.maxCtcLpa,
      sampleSize: insight.sampleSize || 1,
      updatedAt: new Date()
    };
    this.salaryInsights.set(key, entity);
    return entity;
  }

  async findSalaryInsights(companyId: string, collegeId: string): Promise<SalaryInsightEntity[]> {
    return Array.from(this.salaryInsights.values()).filter(
      (s) => s.collegeId === collegeId && s.companyId === companyId
    );
  }
}
