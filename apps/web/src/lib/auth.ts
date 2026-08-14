/**
 * Campizo — Student Auth (client)
 * Persists an in-memory+localStorage session for the anonymous random chat flow.
 * A real JWT/Supabase session would store `ch_auth_token`; here we store the
 * server-issued HMAC token returned by /connect/auth/{register|login}.
 */

import { apiPost, apiGet } from './api-client';

export type Gender = 'MALE' | 'FEMALE';

export interface StudentUser {
  id: string;
  email: string;
  fullName: string;
  gender: Gender;
  collegeId: string;
}

export interface AuthSession {
  user: StudentUser;
  token: string;
}

export const TOKEN_KEY = 'ch_auth_token';
export const USER_KEY = 'ch_user_profile';
export const COLLEGE_KEY = 'ch_college_id';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore write errors (private mode) */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function getSession(): AuthSession | null {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  const user = readJson<StudentUser>(USER_KEY);
  if (!token || !user) return null;
  return { token, user };
}

export function clearSession(): void {
  remove(TOKEN_KEY);
  remove(USER_KEY);
}

export function setSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  writeJson(USER_KEY, session.user);
  localStorage.setItem(COLLEGE_KEY, session.user.collegeId);
}

/** Returns true when an authenticated student session exists. */
export function isAuthenticated(): boolean {
  return !!getSession();
}

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
  gender: Gender;
}): Promise<AuthSession> {
  const { user, token } = await apiPost<{ user: StudentUser; token: string }>('/api/connect/auth/register', {
    ...input,
    collegeId: localStorage.getItem(COLLEGE_KEY) || 'college-nitk-003'
  });
  const session: AuthSession = { token, user };
  setSession(session);
  return session;
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const { user, token } = await apiPost<{ user: StudentUser; token: string }>('/api/connect/auth/login', input);
  const session: AuthSession = { token, user };
  setSession(session);
  return session;
}

export async function fetchCurrentUser(): Promise<StudentUser | null> {
  try {
    const { user } = await apiGet<{ user: StudentUser; authenticated: boolean }>('/api/connect/auth/me');
    if (user) writeJson(USER_KEY, user);
    return user;
  } catch {
    return null;
  }
}

export function logout(): void {
  clearSession();
  window.location.assign('/');
}
