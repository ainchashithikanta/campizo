/**
 * Campizo — React Auth Context
 * Tracks the student session across the app so the Navbar and protected pages
 * can react to login/logout without re-fetching on every render.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSession, clearSession, fetchCurrentUser, type StudentUser, type AuthSession } from '../../lib/auth';

interface AuthState {
  user: StudentUser | null;
  token: string | null;
  loading: boolean;
  /** Resolves the current session (re-read from localStorage). */
  refresh: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const session = getSession();
    setToken(session?.token ?? null);
    if (session?.user) setUser(session.user);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const session = getSession();
    setToken(session?.token ?? null);
    if (session?.user) setUser(session.user);
    // Best-effort server reconcile to validate the token.
    if (session) {
      void fetchCurrentUser().then(
        (serverUser) => {
          if (!cancelled) {
            if (serverUser) setUser(serverUser);
            else clearSession();
            setLoading(false);
          }
        },
        () => {
          if (!cancelled) setLoading(false);
        }
      );
    } else {
      if (!cancelled) setLoading(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
    window.location.assign('/');
  }, []);

  return <AuthContext.Provider value={{ user, token, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}
