/**
 * Campus Connect — Typed Frontend API SDK Client
 * Interacts with backend Fastify endpoints (/connect/*) returning typed ApiV1Response envelopes.
 */

import { apiGet, apiPost, apiPut, apiDelete, buildQueryString } from './api-client';

export interface StudentProfile {
  id: string;
  userId: string;
  collegeId: string;
  fullName: string;
  gender?: 'MALE' | 'FEMALE';
  bio?: string;
  major: string;
  classYear: number;
  skills: string[];
  interests: string[];
  courses: string[];
  clubs: string[];
  isGhostMode: boolean;
}

export interface StudentIntent {
  id: string;
  collegeId: string;
  studentProfileId: string;
  intentType: 'STUDY_PARTNER' | 'PROJECT_COLLABORATOR' | 'MENTORSHIP' | 'SOCIAL_HANG_OUT' | 'RESOURCE_SHARING';
  title: string;
  description?: string;
  courseCode?: string;
  priority: number;
  status: 'ACTIVE' | 'PAUSED' | 'FULFILLED' | 'ARCHIVED';
  availabilityState: string;
  createdAt: string;
  version: number;
}

export interface RecommendationReason {
  reasonCode: string;
  weight: number;
  humanText: string;
}

export interface RecommendationItem {
  snapshotId: string;
  targetStudentId: string;
  targetStudentName: string;
  compatibilityPct: number;
  weightedReasons: RecommendationReason[];
  major?: string;
  classYear?: number;
  sharedCourses?: string[];
  sharedInterests?: string[];
}

export interface ConnectionItem {
  id: string;
  studentAId: string;
  studentBId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  createdAt: string;
}

export interface ConversationItem {
  id: string;
  conversationType: 'DIRECT' | 'STUDY_GROUP' | 'PROJECT_TEAM' | 'MENTORSHIP';
  contextType: string;
  contextId: string;
  title?: string;
  participantIds: string[];
  lastMessageAt?: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderProfileId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export interface StudyGroupItem {
  id: string;
  courseCode: string;
  title: string;
  maxCapacity: number;
  currentMembers: number;
  status: string;
}

export interface ProjectTeamItem {
  id: string;
  title: string;
  description?: string;
  requiredSkills?: string[];
  status: string;
}

export interface MentorshipItem {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
}

export interface PrivacySettings {
  studentProfileId: string;
  isGhostMode: boolean;
  isIncognitoMode: boolean;
  dailyRequestLimit?: number;
  version: number;
}

export interface ActivityEntry {
  activityId: string;
  actorId: string;
  actionType: string;
  metadata: Record<string, any>;
  recordedAt: string;
}

/* API Methods */

export async function fetchMyProfile(): Promise<StudentProfile> {
  return apiGet<StudentProfile>('/api/connect/profile');
}

export async function updateMyProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
  return apiPut<StudentProfile>('/api/connect/profile', data);
}

export async function fetchDiscoveryFeed(
  params: { intentType?: string; courseCode?: string; limit?: number; page?: number } = {}
): Promise<{ items: any[]; total: number; hasMore: boolean }> {
  const qs = buildQueryString(params);
  return apiGet<{ items: any[]; total: number; hasMore: boolean }>(`/api/connect/discovery${qs}`);
}

export async function fetchRecommendations(
  limit: number = 10
): Promise<{ items: RecommendationItem[]; total: number }> {
  return apiGet<{ items: RecommendationItem[]; total: number }>(`/api/connect/recommendations?limit=${limit}`);
}

export async function createIntent(data: {
  intentType: string;
  title: string;
  description?: string;
  courseCode?: string;
  priority?: number;
}): Promise<StudentIntent> {
  return apiPost<StudentIntent>('/api/connect/intents', data);
}

export async function pauseIntent(id: string, version: number = 1): Promise<{ status: string }> {
  return apiPost<{ status: string }>(`/api/connect/intents/${id}/pause`, { version });
}

export async function fulfillIntent(id: string, version: number = 1): Promise<{ status: string }> {
  return apiPost<{ status: string }>(`/api/connect/intents/${id}/fulfill`, { version });
}

export async function archiveIntent(id: string, version: number = 1): Promise<{ status: string }> {
  return apiPost<{ status: string }>(`/api/connect/intents/${id}/archive`, { version });
}

export async function sendConnectionRequest(data: {
  receiverProfileId: string;
  originatingIntentId: string;
  note?: string;
}): Promise<ConnectionItem> {
  return apiPost<ConnectionItem>('/api/connect/connections/request', data);
}

export async function acceptConnection(id: string, version: number = 1): Promise<ConnectionItem> {
  return apiPost<ConnectionItem>(`/api/connect/connections/${id}/accept`, { version });
}

export async function rejectConnection(id: string, version: number = 1): Promise<{ status: string }> {
  return apiPost<{ status: string }>(`/api/connect/connections/${id}/reject`, { version });
}

export async function blockConnection(blockedId: string): Promise<{ status: string }> {
  return apiPost<{ status: string }>('/api/connect/connections/block', { blockedId });
}

export async function fetchNetwork(): Promise<{ items: ConnectionItem[]; total: number }> {
  return apiGet<{ items: ConnectionItem[]; total: number }>('/api/connect/network');
}

export async function createConversation(data: {
  conversationType?: string;
  contextType: string;
  contextId: string;
  title?: string;
}): Promise<ConversationItem> {
  return apiPost<ConversationItem>('/api/connect/conversations', data);
}

export async function fetchConversation(id: string): Promise<ConversationItem> {
  return apiGet<ConversationItem>(`/api/connect/conversations/${id}`);
}

export async function sendMessage(data: { conversationId: string; content: string }): Promise<MessageItem> {
  return apiPost<MessageItem>('/api/connect/messages', data);
}

export async function createStudyGroup(data: { courseCode: string; title: string }): Promise<StudyGroupItem> {
  return apiPost<StudyGroupItem>('/api/connect/study-groups', data);
}

export async function fetchStudyGroups(courseCode?: string): Promise<StudyGroupItem[]> {
  const qs = courseCode ? `?courseCode=${encodeURIComponent(courseCode)}` : '';
  return apiGet<StudyGroupItem[]>(`/api/connect/study-groups${qs}`);
}

export async function createProjectTeam(data: { title: string; description?: string }): Promise<ProjectTeamItem> {
  return apiPost<ProjectTeamItem>('/api/connect/projects', data);
}

export async function fetchProjectTeams(): Promise<ProjectTeamItem[]> {
  return apiGet<ProjectTeamItem[]>('/api/connect/projects');
}

export async function createMentorship(data: { mentorId: string; menteeId: string }): Promise<MentorshipItem> {
  return apiPost<MentorshipItem>('/api/connect/mentorship', data);
}

export async function fetchMentorships(): Promise<MentorshipItem[]> {
  return apiGet<MentorshipItem[]>('/api/connect/mentorship');
}

export async function fetchPrivacySettings(): Promise<PrivacySettings> {
  return apiGet<PrivacySettings>('/api/connect/privacy');
}

export async function updatePrivacySettings(data: {
  isGhostMode: boolean;
  isIncognitoMode: boolean;
  version?: number;
}): Promise<PrivacySettings> {
  return apiPut<PrivacySettings>('/api/connect/privacy', data);
}

export async function fetchActivityFeed(): Promise<ActivityEntry[]> {
  return apiGet<ActivityEntry[]>('/api/connect/activity');
}

/* ---------- Random Chat (E2E encrypted, opposite gender) ---------- */

export interface RandomChatStatus {
  status: 'WAITING' | 'MATCHED' | 'CLOSED' | 'IDLE';
  joinedAt?: string;
  conversationId?: string;
  peerGender?: string | null;
  expiresAt?: string;
  matchedAt?: string;
  conversationKey?: string;
  reason?: string;
  closedBy?: string;
  closedAt?: string;
}

/**
 * Join the random chat pool. Resolves with one of:
 *  - { status: 'WAITING', joinedAt } — no opposite-gender peer available yet.
 *  - { status: 'MATCHED', conversationId, peerGender, expiresAt, conversationKey } — matched now.
 * The conversationKey is an AES-256-GCM key delivered only to the two matched
 * participants; messages are encrypted client-side before hitting the server.
 */
export async function joinRandomChat(): Promise<RandomChatStatus> {
  return apiPost<RandomChatStatus>('/api/connect/random/join', {});
}

export async function fetchRandomChatStatus(): Promise<RandomChatStatus> {
  return apiGet<RandomChatStatus>('/api/connect/random/status');
}

export async function leaveRandomChat(): Promise<RandomChatStatus> {
  return apiPost<RandomChatStatus>('/api/connect/random/leave', {});
}

export interface EncryptedMessage {
  id: string;
  conversationId: string;
  senderProfileId: string;
  ciphertext: string | null;
  iv: string | null;
  algorithm: string | null;
  createdAt: string;
}

/** Send a message already encrypted client-side (ciphertext + iv). */
export async function sendEncryptedMessage(data: {
  conversationId: string;
  ciphertext: string;
  iv: string;
}): Promise<EncryptedMessage> {
  return apiPost<EncryptedMessage>('/api/connect/messages', {
    ...data,
    algorithm: 'AES-256-GCM'
  });
}
