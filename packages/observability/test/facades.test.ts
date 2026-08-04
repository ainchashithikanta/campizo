import { describe, it, expect } from 'vitest';
import { createMetricsRegistry } from '../src/registry.js';
import { createHttpMetrics } from '../src/http-metrics.js';
import { createDbMetrics, normalizeSql, hashSql } from '../src/db-metrics.js';
import { createCacheMetrics } from '../src/cache-metrics.js';
import { createJobMetrics } from '../src/job-metrics.js';
import { createBusinessMetrics } from '../src/business-metrics.js';

describe('Metric facades (MS-55)', () => {
  it('http metrics record totals, duration and return in-flight gauge to zero', async () => {
    const registry = createMetricsRegistry();
    const http = createHttpMetrics(registry);
    http.requestStarted('GET', '/api/health');
    http.requestFinished('GET', '/api/health', 200, 25, 1024);

    const text = await registry.metrics();
    expect(text).toMatch(/collegehub_http_requests_total\{method="GET",route="\/api\/health",status="200"\} 1/);
    expect(text).toContain('collegehub_http_request_duration_seconds');
    expect(text).toContain('collegehub_http_response_size_bytes');
    expect(text).toMatch(/collegehub_http_requests_in_flight\{method="GET",route="\/api\/health"\} 0/);
  });

  it('db metrics record query duration, errors and pool state', async () => {
    const registry = createMetricsRegistry();
    const db = createDbMetrics(registry);
    db.observeQuery(12, true);
    db.observeQuery(30, false);
    db.setPoolStats(10, 7, 3);

    const text = await registry.metrics();
    expect(text).toContain('collegehub_db_query_duration_seconds');
    expect(text).toMatch(/collegehub_db_query_errors_total 1/);
    expect(text).toContain('collegehub_db_pool{state="total"} 10');
    expect(text).toContain('collegehub_db_pool{state="idle"} 7');
    expect(text).toContain('collegehub_db_pool{state="waiting"} 3');
  });

  it('db metrics mark slow queries with normalized hash and prefix', async () => {
    const registry = createMetricsRegistry();
    const db = createDbMetrics(registry);
    db.markSlowQuery('SELECT * FROM users WHERE id = 42', 350);

    const text = await registry.metrics();
    expect(text).toContain('collegehub_db_slow_queries_total');
    expect(text).toContain('query_prefix="select * from users where id = ?"');
    expect(text).toContain('collegehub_db_slow_query_duration_seconds');
  });

  it('normalizeSql strips literals and hashSql is deterministic', () => {
    expect(normalizeSql("SELECT * FROM users WHERE id = 42 AND email = 'a@b.c'")).toBe(
      'select * from users where id = ? and email = ?'
    );
    expect(hashSql(normalizeSql('select id from t where x=1'))).toBe(
      hashSql(normalizeSql('select id from t where x=999'))
    );
  });

  it('cache metrics record commands, errors and connectivity', async () => {
    const registry = createMetricsRegistry();
    const cache = createCacheMetrics(registry);
    cache.observeCommand('get', 2, true);
    cache.observeCommand('set', 4, false);
    cache.setConnected(true);

    const text = await registry.metrics();
    expect(text).toContain('collegehub_redis_commands_total{command="get"} 1');
    expect(text).toMatch(/collegehub_redis_errors_total 1/);
    expect(text).toContain('collegehub_cache_connected 1');
  });

  it('job metrics record success and failure results', async () => {
    const registry = createMetricsRegistry();
    const jobs = createJobMetrics(registry);
    jobs.jobStarted('sync');
    jobs.jobFinished('sync', true, 100);
    jobs.jobStarted('export');
    jobs.jobFinished('export', false, 50);

    const text = await registry.metrics();
    expect(text).toContain('collegehub_jobs_total{job="sync",result="success"} 1');
    expect(text).toContain('collegehub_jobs_total{job="export",result="failure"} 1');
    expect(text).toContain('collegehub_job_duration_seconds');
  });

  it('business metrics expose all lifecycle counters', async () => {
    const registry = createMetricsRegistry();
    const business = createBusinessMetrics(registry);
    business.loginSuccess();
    business.loginFailure();
    business.registrationSuccess();
    business.registrationFailure();
    business.listingCreated();
    business.listingPublished();
    business.listingSold();
    business.offerCreated();
    business.offerAccepted();
    business.notificationPublished();
    business.notificationDropped();
    business.notificationFailed();
    business.placementQuery();
    business.placementQuery('company');
    business.interviewSubmitted();

    const text = await registry.metrics();
    expect(text).toContain('collegehub_auth_logins_total{result="success"} 1');
    expect(text).toContain('collegehub_auth_logins_total{result="failure"} 1');
    expect(text).toContain('collegehub_auth_registrations_total{result="success"} 1');
    expect(text).toContain('collegehub_marketplace_listings_total{action="created"} 1');
    expect(text).toContain('collegehub_marketplace_listings_total{action="published"} 1');
    expect(text).toContain('collegehub_marketplace_listings_total{action="sold"} 1');
    expect(text).toContain('collegehub_marketplace_offers_total{action="created"} 1');
    expect(text).toContain('collegehub_marketplace_offers_total{action="accepted"} 1');
    expect(text).toContain('collegehub_notifications_total{action="published"} 1');
    expect(text).toContain('collegehub_notifications_total{action="dropped"} 1');
    expect(text).toContain('collegehub_notifications_total{action="failed"} 1');
    expect(text).toContain('collegehub_placement_queries_total{kind="question"} 1');
    expect(text).toContain('collegehub_placement_queries_total{kind="company"} 1');
    expect(text).toContain('collegehub_interview_submissions_total{result="success"} 1');
  });
});
