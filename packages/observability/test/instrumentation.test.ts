import { describe, it, expect } from 'vitest';
import { createMetricsRegistry } from '../src/registry.js';
import { createDbMetrics } from '../src/db-metrics.js';
import { createCacheMetrics } from '../src/cache-metrics.js';
import { createJobMetrics } from '../src/job-metrics.js';
import {
  instrumentQueryClient,
  instrumentRedisClient,
  startPoolStatsMonitor,
  withJobMetrics
} from '../src/instrumentation.js';

interface FakePgClient {
  query: (...args: unknown[]) => Promise<unknown>;
}

interface FakeRedisClient {
  sendCommand?: (...args: unknown[]) => Promise<unknown>;
}

describe('Runtime instrumentation helpers (MS-55)', () => {
  it('instrumentQueryClient preserves identity and records success metrics', async () => {
    const registry = createMetricsRegistry();
    const db = createDbMetrics(registry);
    const client: FakePgClient = {
      query: async (sql: unknown) => ({ rows: [1] })
    };

    const wrapped = instrumentQueryClient(client, db);
    expect(wrapped).toBe(client);

    const result = await wrapped.query('SELECT 1');
    expect(result).toEqual({ rows: [1] });

    const text = await registry.metrics();
    expect(text).toContain('collegehub_db_query_duration_seconds');
    expect(text).toContain('collegehub_db_query_errors_total 0');
  });

  it('instrumentQueryClient records errors and slow queries', async () => {
    const registry = createMetricsRegistry();
    const db = createDbMetrics(registry);
    const client: FakePgClient = {
      query: async () => {
        throw new Error('db down');
      }
    };
    const wrapped = instrumentQueryClient(client, db, { slowQueryThresholdMs: 1 });
    await expect(wrapped.query('SELECT * FROM users')).rejects.toThrow('db down');

    const text = await registry.metrics();
    expect(text).toMatch(/collegehub_db_query_errors_total 1/);
    expect(text).toContain('collegehub_db_slow_queries_total');
  });

  it('instrumentRedisClient records commands and errors', async () => {
    const registry = createMetricsRegistry();
    const cache = createCacheMetrics(registry);
    const client: FakeRedisClient = {
      sendCommand: async (command: unknown) => {
        const args = command as string[];
        if (args[0] === 'SET') {
          throw new Error('redis down');
        }
        return String(command);
      }
    };
    const wrapped = instrumentRedisClient(client, cache);
    expect(wrapped).toBe(client);

    await wrapped.sendCommand!(['PING']);
    await expect(wrapped.sendCommand!(['SET'])).rejects.toThrow();

    const text = await registry.metrics();
    expect(text).toContain('collegehub_redis_commands_total{command="PING"} 1');
    expect(text).toMatch(/collegehub_redis_errors_total 1/);
  });

  it('startPoolStatsMonitor samples pool state and stops on cleanup', async () => {
    const registry = createMetricsRegistry();
    const db = createDbMetrics(registry);
    const pool = { totalCount: 8, idleCount: 5, waitingCount: 1 };

    const stop = startPoolStatsMonitor(pool, db, 10);
    await new Promise((resolve) => setTimeout(resolve, 25));
    stop();

    const text = await registry.metrics();
    expect(text).toContain('collegehub_db_pool{state="total"} 8');
    expect(text).toContain('collegehub_db_pool{state="idle"} 5');
    expect(text).toContain('collegehub_db_pool{state="waiting"} 1');
  });

  it('withJobMetrics records success and returns the result', async () => {
    const registry = createMetricsRegistry();
    const jobs = createJobMetrics(registry);
    const result = await withJobMetrics('sync', jobs, async () => 42);
    expect(result).toBe(42);

    const text = await registry.metrics();
    expect(text).toContain('collegehub_jobs_total{job="sync",result="success"} 1');
    expect(text).toContain('collegehub_jobs_in_flight{job="sync"} 0');
  });

  it('withJobMetrics records failure and rethrows', async () => {
    const registry = createMetricsRegistry();
    const jobs = createJobMetrics(registry);
    await expect(
      withJobMetrics('export', jobs, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const text = await registry.metrics();
    expect(text).toContain('collegehub_jobs_total{job="export",result="failure"} 1');
  });
});
