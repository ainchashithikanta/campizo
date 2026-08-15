/**
 * Custom React Hooks for API Data Fetching
 * Manages loading/error/success states with abort controller support.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SearchParams,
  ProfessorSummaryDto,
  ProfessorProfileDto,
  ProfessorStatisticsDto,
  ReviewDto,
  DepartmentSummaryDto
} from '@web/lib/types';
import * as api from '@web/lib/api';

/* ---------- Generic Query Hook ---------- */

interface UseApiQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = []
): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const fetchCountRef = useRef(0);

  const execute = useCallback(() => {
    const currentFetch = ++fetchCountRef.current;
    setLoading(true);
    setError(null);

    const abortController = new AbortController();

    fetcher(abortController.signal)
      .then((result) => {
        if (mountedRef.current && currentFetch === fetchCountRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        if (mountedRef.current && currentFetch === fetchCountRef.current) {
          setError(err.message || 'An error occurred');
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    const cleanup = execute();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [execute]);

  return { data, error, loading, refetch: execute };
}

/* ---------- Generic Mutation Hook ---------- */

interface UseApiMutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput>;
  data: TOutput | null;
  error: string | null;
  loading: boolean;
  reset: () => void;
}

export function useApiMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>
): UseApiMutationResult<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(input);
        setData(result);
        setLoading(false);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Mutation failed';
        setError(msg);
        setLoading(false);
        throw err;
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, data, error, loading, reset };
}

/* ---------- Domain-Specific Hooks ---------- */

export function useProfessors(params: SearchParams) {
  return useApiQuery<ProfessorSummaryDto[]>(
    (signal) => api.searchProfessors(params, signal),
    [params.query, params.dept, params.page, params.limit]
  );
}

export function useProfessorProfile(slug: string) {
  return useApiQuery<ProfessorProfileDto>((signal) => api.getProfessorProfile(slug, signal), [slug]);
}

export function useProfessorStats(slug: string) {
  return useApiQuery<ProfessorStatisticsDto>((signal) => api.getProfessorStatistics(slug, signal), [slug]);
}

export function useProfessorReviews(slug: string, page = 1) {
  return useApiQuery<ReviewDto[]>((signal) => api.getProfessorReviews(slug, page, 20, signal), [slug, page]);
}

export function useDepartments() {
  return useApiQuery<DepartmentSummaryDto[]>((signal) => api.searchDepartments(signal), []);
}

/* ---------- Debounce Hook ---------- */

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
