/**
 * Rate My Professor — Domain API Functions
 * Typed wrappers around the generic API client for each endpoint.
 */

import { apiGet, apiPost, apiPut, apiDelete, buildQueryString } from './api-client';
import type {
  ProfessorSummaryDto,
  ProfessorProfileDto,
  ProfessorStatisticsDto,
  ReviewDto,
  ReviewCreateRequest,
  ReviewEditRequest,
  VoteRequest,
  ReportRequest,
  FacultyResponseRequest,
  SearchParams,
} from './types';

const BASE = '/api/v1/professors';

/* ---------- Professor Endpoints ---------- */

export function searchProfessors(params: SearchParams, signal?: AbortSignal) {
  const qs = buildQueryString(params as Record<string, unknown>);
  return apiGet<ProfessorSummaryDto[]>(`${BASE}${qs}`, signal);
}

export function getProfessorProfile(slug: string, signal?: AbortSignal) {
  return apiGet<ProfessorProfileDto>(`${BASE}/${slug}`, signal);
}

export function getProfessorStatistics(slug: string, signal?: AbortSignal) {
  return apiGet<ProfessorStatisticsDto>(`${BASE}/${slug}/statistics`, signal);
}

/* ---------- Review Endpoints ---------- */

export function getProfessorReviews(slug: string, page = 1, limit = 20, signal?: AbortSignal) {
  const qs = buildQueryString({ page, limit });
  return apiGet<ReviewDto[]>(`${BASE}/${slug}/reviews${qs}`, signal);
}

export function submitReview(slug: string, data: ReviewCreateRequest, signal?: AbortSignal) {
  return apiPost<ReviewDto>(`${BASE}/${slug}/reviews`, data, signal);
}

export function editReview(slug: string, reviewId: string, data: ReviewEditRequest, signal?: AbortSignal) {
  return apiPut<ReviewDto>(`${BASE}/${slug}/reviews/${reviewId}`, data, signal);
}

export function deleteReview(slug: string, reviewId: string, signal?: AbortSignal) {
  return apiDelete<{ status: string }>(`${BASE}/${slug}/reviews/${reviewId}`, signal);
}

/* ---------- Vote Endpoints ---------- */

export function voteOnReview(slug: string, reviewId: string, data: VoteRequest, signal?: AbortSignal) {
  return apiPost<{ status: string }>(`${BASE}/${slug}/reviews/${reviewId}/votes`, data, signal);
}

export function removeVote(slug: string, reviewId: string, signal?: AbortSignal) {
  return apiDelete<{ status: string }>(`${BASE}/${slug}/reviews/${reviewId}/votes`, signal);
}

/* ---------- Report Endpoints ---------- */

export function reportReview(slug: string, reviewId: string, data: ReportRequest, signal?: AbortSignal) {
  return apiPost<{ status: string }>(`${BASE}/${slug}/reviews/${reviewId}/reports`, data, signal);
}

/* ---------- Faculty Endpoints ---------- */

export function addFacultyResponse(slug: string, reviewId: string, data: FacultyResponseRequest, signal?: AbortSignal) {
  return apiPost<unknown>(`${BASE}/${slug}/reviews/${reviewId}/response`, data, signal);
}
