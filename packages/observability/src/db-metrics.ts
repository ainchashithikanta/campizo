/**
 * Database (PostgreSQL) metrics helpers (MS-55).
 */

import type { MetricsRegistry } from './registry.js';

export interface DbMetrics {
  observeQuery(durationMs: number, ok: boolean): void;
  markSlowQuery(sql: string, durationMs: number): void;
  setPoolStats(total: number, idle: number, waiting: number): void;
}

export function createDbMetrics(registry: MetricsRegistry): DbMetrics {
  const queryDuration = registry.histogram('collegehub_db_query_duration_seconds', 'PostgreSQL query duration', {
    labelNames: ['result'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
  });
  const queryErrors = registry.counter('collegehub_db_query_errors_total', 'Failed PostgreSQL queries');
  const slowQueries = registry.counter(
    'collegehub_db_slow_queries_total',
    'Slow PostgreSQL queries exceeding threshold',
    ['query_hash', 'query_prefix']
  );
  const poolGauge = registry.gauge('collegehub_db_pool', 'PostgreSQL connection pool state', ['state']);

  return {
    observeQuery(durationMs: number, ok: boolean): void {
      queryDuration.observe({ result: ok ? 'success' : 'error' }, durationMs / 1000);
      if (!ok) {
        queryErrors.inc();
      }
    },

    markSlowQuery(sql: string, durationMs: number): void {
      const normalized = normalizeSql(sql);
      slowQueries.inc({ query_hash: hashSql(normalized), query_prefix: normalized.slice(0, 60) }, 1);
      const slowDuration = slowQueryDuration(registry);
      slowDuration.observe(durationMs / 1000);
    },

    setPoolStats(total: number, idle: number, waiting: number): void {
      poolGauge.set({ state: 'total' }, total);
      poolGauge.set({ state: 'idle' }, idle);
      poolGauge.set({ state: 'waiting' }, waiting);
    }
  };
}

export function normalizeSql(sql: string): string {
  return sql
    .replace(/'(?:[^'\\]|\\.)*'/g, '?')
    .replace(/\b\d+\b/g, '?')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function hashSql(normalizedSql: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalizedSql.length; i += 1) {
    hash ^= normalizedSql.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function slowQueryDuration(registry: MetricsRegistry) {
  return registry.histogram('collegehub_db_slow_query_duration_seconds', 'Duration of slow PostgreSQL queries', {
    buckets: [0.25, 0.5, 1, 2.5, 5, 10, 30]
  });
}
