/**
 * Runtime instrumentation helpers (MS-55).
 * Non-invasive wrappers for PostgreSQL (pg), Redis (node-redis) and background
 * jobs. They record Prometheus metrics and OpenTelemetry spans without changing
 * business behavior.
 */

import { runInSpan } from './tracing.js';
import type { CacheMetrics } from './cache-metrics.js';
import type { DbMetrics } from './db-metrics.js';
import type { JobMetrics } from './job-metrics.js';

// ---------------------------------------------------------------------------
// PostgreSQL query instrumentation
// ---------------------------------------------------------------------------

export interface QueryInstrumentationOptions {
  slowQueryThresholdMs?: number;
}

interface MutableQueryClient {
  query: (...args: unknown[]) => Promise<unknown>;
}

function extractSql(queryArg: unknown): string | undefined {
  if (typeof queryArg === 'string') {
    return queryArg;
  }
  if (queryArg !== null && typeof queryArg === 'object') {
    const candidate = queryArg as { text?: unknown };
    if (typeof candidate.text === 'string') {
      return candidate.text;
    }
  }
  return undefined;
}

/**
 * Wrap `client.query` to record per-query duration/error metrics and slow-query
 * counters. The wrapped instance is returned unchanged (identity preserved).
 */
export function instrumentQueryClient<T>(
  client: T,
  dbMetrics: DbMetrics,
  options: QueryInstrumentationOptions = {}
): T {
  const mutable = client as unknown as MutableQueryClient;
  if (typeof mutable.query !== 'function') {
    return client;
  }

  const original = mutable.query.bind(client as object);
  const slowThresholdMs = options.slowQueryThresholdMs ?? 200;

  mutable.query = async (...args: unknown[]): Promise<unknown> => {
    const startedAt = performance.now();
    try {
      const result = await original(...args);
      const durationMs = performance.now() - startedAt;
      dbMetrics.observeQuery(durationMs, true);
      recordSlowIfNeeded(extractSql(args[0]), durationMs, slowThresholdMs, dbMetrics);
      return result;
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      dbMetrics.observeQuery(durationMs, false);
      recordSlowIfNeeded(extractSql(args[0]), durationMs, slowThresholdMs, dbMetrics);
      throw error;
    }
  };

  return client;
}

function recordSlowIfNeeded(
  sql: string | undefined,
  durationMs: number,
  thresholdMs: number,
  dbMetrics: DbMetrics
): void {
  if (durationMs >= thresholdMs && sql !== undefined) {
    dbMetrics.markSlowQuery(sql, durationMs);
  }
}

/** Begin periodic reporting of PostgreSQL connection pool state. Returns a stop function. */
export function startPoolStatsMonitor(pool: object, dbMetrics: DbMetrics, intervalMs = 5000): () => void {
  const stats = pool as { totalCount?: number; idleCount?: number; waitingCount?: number };
  const tick = (): void => {
    dbMetrics.setPoolStats(stats.totalCount ?? 0, stats.idleCount ?? 0, stats.waitingCount ?? 0);
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

// ---------------------------------------------------------------------------
// Redis command instrumentation
// ---------------------------------------------------------------------------

interface MutableRedisClient {
  sendCommand?: (...args: unknown[]) => Promise<unknown>;
}

function extractCommand(args: unknown[]): string {
  const raw = args[0];
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first === undefined ? 'unknown' : String(first);
  }
  return raw === undefined ? 'unknown' : String(raw);
}

/**
 * Wrap `client.sendCommand` so every Redis command (including high-level helpers
 * such as ping/get/set) records latency and error metrics.
 */
export function instrumentRedisClient<T>(client: T, cacheMetrics: CacheMetrics): T {
  const mutable = client as unknown as MutableRedisClient;
  if (typeof mutable.sendCommand !== 'function') {
    return client;
  }

  const original = mutable.sendCommand.bind(client as object);
  mutable.sendCommand = async (...args: unknown[]): Promise<unknown> => {
    const command = extractCommand(args);
    const startedAt = performance.now();
    try {
      const result = await original(...args);
      cacheMetrics.observeCommand(command, performance.now() - startedAt, true);
      return result;
    } catch (error) {
      cacheMetrics.observeCommand(command, performance.now() - startedAt, false);
      throw error;
    }
  };

  return client;
}

// ---------------------------------------------------------------------------
// Background job instrumentation
// ---------------------------------------------------------------------------

/**
 * Run a background job inside a span, recording duration/result metrics.
 * Re-throws on failure after recording.
 */
export async function withJobMetrics<T>(jobName: string, jobMetrics: JobMetrics, fn: () => Promise<T>): Promise<T> {
  jobMetrics.jobStarted(jobName);
  const startedAt = performance.now();
  try {
    const result = await runInSpan(`job.${jobName}`, { attributes: { 'job.name': jobName } }, fn);
    jobMetrics.jobFinished(jobName, true, performance.now() - startedAt);
    return result;
  } catch (error) {
    jobMetrics.jobFinished(jobName, false, performance.now() - startedAt);
    throw error;
  }
}
