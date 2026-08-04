/**
 * Placement Guidance — Typed Frontend API SDK Client
 */

import { apiGet, apiPost, apiPatch, apiDelete, buildQueryString } from './api-client';

export interface Company {
  id: string;
  collegeId: string;
  name: string;
  slug: string;
  website?: string | null;
  officialWebsite?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  careerUrl?: string | null;
  glassdoorUrl?: string | null;
  industry: string;
  tier: string;
}

export interface QuestionBankItem {
  id: string;
  companyId?: string | null;
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
  createdAt: string;
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  content: string;
  upvotesCount: number;
  downvotesCount: number;
  isAcceptedAnswer: boolean;
  createdAt: string;
}

export interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  topic: string;
  companySlug?: string | null;
  upvotesCount: number;
  downvotesCount: number;
  repliesCount: number;
  viewsCount: number;
  status: 'ACTIVE' | 'CLOSED' | 'FLAGGED';
  createdAt: string;
  replies?: DiscussionReply[];
}

export interface CompanyStatistics {
  id: string;
  companyId: string;
  interviewCount: number;
  avgCtcLpa: number;
  highestCtcLpa: number;
  avgDifficulty: number;
  internshipCount: number;
  fullTimeCount: number;
  mostCommonTopics: string[];
  lastComputedAt: string;
}

export interface AdminRoadmap {
  id: string;
  title: string;
  description: string;
  steps: Array<{
    order: number;
    topic: string;
    description: string;
    recommendedProblemsCount: number;
  }>;
  updatedAt: string;
}

export interface InterviewQuestion {
  id: string;
  roundId: string;
  questionText: string;
  questionCategory: 'ALGORITHMS' | 'SYSTEM_DESIGN' | 'BEHAVIORAL' | 'LANGUAGE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface InterviewRound {
  id: string;
  experienceId: string;
  roundNumber: number;
  roundName: string;
  roundType: 'ONLINE_ASSESSMENT' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'HR';
  durationMinutes: number;
  description: string;
  topicsCovered: string[];
  questions?: InterviewQuestion[];
}

export interface PlacementExperience {
  id: string;
  collegeId: string;
  companyId: string;
  authorId: string;
  roleTitle: string;
  jobType: 'INTERNSHIP' | 'FULL_TIME';
  branch: string;
  cgpa: number;
  ctcOfferedLpa?: number | null;
  stipendMonthly?: number | null;
  offerStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  difficultyRating: number;
  overallRating: number;
  summary: string;
  preparationTips?: string | null;
  versionNumber: number;
  helpfulCount: number;
  reportsCount: number;
  isAnonymous: boolean;
  status: 'APPROVED' | 'PENDING' | 'FLAGGED';
  companyName?: string;
  companySlug?: string;
  rounds?: InterviewRound[];
  createdAt: string;
}

export interface CompanyAISummary {
  id: string;
  companyId: string;
  companySummary: string;
  topTopics: string[];
  difficultyDistribution: Record<string, number>;
  salaryDistribution: Record<string, number>;
  lastGeneratedAt: string;
}

export interface PlacementBookmark {
  id: string;
  targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD';
  targetId: string;
  createdAt: string;
}

export interface SalaryInsight {
  id: string;
  companyId: string;
  roleTitle: string;
  batchYear: number;
  avgCtcLpa: number;
  minCtcLpa: number;
  maxCtcLpa: number;
  sampleSize: number;
}

/* API Methods */

export async function fetchPlacements(params: { companySlug?: string; jobType?: string; branch?: string; query?: string; page?: number; limit?: number } = {}): Promise<{ items: PlacementExperience[]; total: number; hasMore: boolean }> {
  const qs = buildQueryString(params);
  return apiGet<{ items: PlacementExperience[]; total: number; hasMore: boolean }>(`/placements${qs}`);
}

export async function fetchCompanyBySlug(slug: string): Promise<{ company: Company; experiences: PlacementExperience[]; salaryInsights: SalaryInsight[]; aiSummary?: CompanyAISummary | null }> {
  return apiGet<{ company: Company; experiences: PlacementExperience[]; salaryInsights: SalaryInsight[]; aiSummary?: CompanyAISummary | null }>(`/placements/company/${slug}`);
}

export async function fetchCompanyStatistics(slug: string): Promise<CompanyStatistics> {
  return apiGet<CompanyStatistics>(`/placements/company/${slug}/statistics`);
}

export async function fetchExperienceById(id: string): Promise<PlacementExperience> {
  return apiGet<PlacementExperience>(`/placements/experience/${id}`);
}

export async function submitPlacementExperience(data: any): Promise<PlacementExperience> {
  return apiPost<PlacementExperience>('/placements/experience', data);
}

/* Question Bank API Methods */
export async function fetchQuestions(params: { companyName?: string; topic?: string; difficulty?: string; jobType?: string; query?: string; page?: number; limit?: number } = {}): Promise<{ items: QuestionBankItem[]; total: number; hasMore: boolean }> {
  const qs = buildQueryString(params);
  return apiGet<{ items: QuestionBankItem[]; total: number; hasMore: boolean }>(`/placements/questions${qs}`);
}

export async function fetchQuestionById(id: string): Promise<QuestionBankItem> {
  return apiGet<QuestionBankItem>(`/placements/questions/${id}`);
}

export async function createQuestion(data: { companyName: string; roleTitle: string; questionText: string; topic: string; difficulty?: string; roundType?: string; jobType?: string }): Promise<QuestionBankItem> {
  return apiPost<QuestionBankItem>('/placements/questions', data);
}

export async function markQuestionHelpful(id: string): Promise<QuestionBankItem> {
  return apiPatch<QuestionBankItem>(`/placements/questions/${id}/helpful`, {});
}

/* Community Q&A API Methods */
export async function fetchDiscussions(params: { topic?: string; companySlug?: string; query?: string } = {}): Promise<{ items: DiscussionThread[]; total: number; hasMore: boolean }> {
  const qs = buildQueryString(params);
  return apiGet<{ items: DiscussionThread[]; total: number; hasMore: boolean }>(`/placements/discussions${qs}`);
}

export async function fetchDiscussionById(id: string): Promise<DiscussionThread> {
  return apiGet<DiscussionThread>(`/placements/discussions/${id}`);
}

export async function createDiscussion(data: { title: string; content: string; topic: string; companySlug?: string }): Promise<DiscussionThread> {
  return apiPost<DiscussionThread>('/placements/discussions', data);
}

export async function createReply(threadId: string, content: string): Promise<DiscussionReply> {
  return apiPost<DiscussionReply>(`/placements/discussions/${threadId}/reply`, { content });
}

export async function voteDiscussion(id: string, direction: 'UPVOTE' | 'DOWNVOTE'): Promise<DiscussionThread> {
  return apiPatch<DiscussionThread>(`/placements/discussions/${id}/vote`, { direction });
}

export async function voteReply(replyId: string, threadId: string, direction: 'UPVOTE' | 'DOWNVOTE'): Promise<DiscussionReply> {
  return apiPatch<DiscussionReply>(`/placements/replies/${replyId}/vote`, { threadId, direction });
}

/* Roadmaps & Bookmarks & Trending */
export async function fetchAdminRoadmaps(): Promise<AdminRoadmap[]> {
  return apiGet<AdminRoadmap[]>('/placements/roadmaps');
}

export async function saveBookmark(targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD', targetId: string): Promise<PlacementBookmark> {
  return apiPost<PlacementBookmark>('/placements/bookmarks', { targetType, targetId });
}

export async function removeBookmark(targetType: 'COMPANY' | 'EXPERIENCE' | 'QUESTION' | 'THREAD', targetId: string): Promise<{ removed: boolean }> {
  return apiDelete<{ removed: boolean }>(`/placements/bookmarks/${targetType}/${targetId}`);
}

export async function fetchUserBookmarks(): Promise<PlacementBookmark[]> {
  return apiGet<PlacementBookmark[]>('/placements/bookmarks');
}

export async function fetchTrendingCompanies(): Promise<Array<{ companyId: string; name: string; slug: string; activityCount: number }>> {
  return apiGet<Array<{ companyId: string; name: string; slug: string; activityCount: number }>>('/placements/trending');
}

export async function markExperienceHelpful(id: string): Promise<PlacementExperience> {
  return apiPost<PlacementExperience>(`/placements/${id}/helpful`, {});
}

export async function reportExperience(id: string, reason?: string): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/placements/report', { id, reason });
}
