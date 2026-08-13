/**
 * College Hub — Typed HTTP API Client
 * Handles authenticated requests, error envelopes, and abort controllers.
 */

import type { ApiResponse, ApiErrorResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Custom error class for API request failures */
export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly requestId: string;

  constructor(status: number, code: string, message: string, requestId: string = 'unknown') {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/** Build request headers with tenant context and auth */
function buildHeaders(custom?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  // Inject tenant context
  if (typeof window !== 'undefined') {
    const collegeId = localStorage.getItem('ch_college_id');
    const userId = localStorage.getItem('ch_user_id');
    const authToken = localStorage.getItem('ch_auth_token');
    headers['x-college-id'] = collegeId || 'college-stanford-001';
    if (userId) headers['x-user-id'] = userId;
    if (authToken) headers['x-auth-token'] = authToken;
  }

  if (custom) Object.assign(headers, custom);
  return headers;
}

/** Core request function with typed response handling */
async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: buildHeaders(),
    signal
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    let errorPayload: ApiErrorResponse | null = null;
    try {
      errorPayload = (await res.json()) as ApiErrorResponse;
    } catch {
      // Non-JSON error response
    }

    throw new ApiRequestError(
      res.status,
      errorPayload?.error?.code || `HTTP_${res.status}`,
      errorPayload?.error?.message || res.statusText,
      errorPayload?.error?.requestId
    );
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    const err = json as ApiErrorResponse;
    throw new ApiRequestError(res.status, err.error.code, err.error.message, err.error.requestId);
  }

  return (json as { success: true; data: T }).data;
}

/* ---------- HTTP Method Helpers ---------- */

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>('GET', path, undefined, signal);
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>('POST', path, body, signal);
}

export function apiPut<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>('PUT', path, body, signal);
}

export function apiPatch<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>('PATCH', path, body, signal);
}

export function apiDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>('DELETE', path, undefined, signal);
}

/** Build query string from params object (skips undefined/null values) */
export function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length > 0 ? `?${entries.join('&')}` : '';
}
