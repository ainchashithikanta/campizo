import { describe, it, expect } from 'vitest';
import {
  FeatureFlagService,
  DistributedTracer,
  AdaptiveRateLimiter,
  MeilisearchProvider,
  OpenSearchProvider,
  MockAiModerationProvider,
  HealthCheckService,
  PrometheusMetricsService,
  DlqManager,
  EventRouter
} from '../src/index.js';

describe('Post-V1 Production Enhancements & Chaos Testing Suite', () => {
  const COLLEGE = 'college-stanford-001';

  it('1. should manage FeatureFlagService runtime toggles', () => {
    const flags = new FeatureFlagService();
    expect(flags.isEnabled('enableDistributedTracing')).toBe(true);
    expect(flags.isEnabled('enableAiModeration')).toBe(false);

    flags.setFlag('enableAiModeration', true);
    expect(flags.isEnabled('enableAiModeration')).toBe(true);
  });

  it('2. should record OpenTelemetry spans via DistributedTracer', () => {
    const tracer = new DistributedTracer();
    const span = tracer.startSpan('ConfessionUseCase.create', 'trace-101', { collegeId: COLLEGE });
    expect(span.name).toBe('ConfessionUseCase.create');

    tracer.endSpan(span.spanId, { success: true });
    const completed = tracer.getCompletedSpans();
    expect(completed.length).toBe(1);
    expect(completed[0]?.attributes['success']).toBe(true);
  });

  it('3. should enforce AdaptiveRateLimiter multi-dimensional limits', () => {
    const limiter = new AdaptiveRateLimiter();
    const dimension = { collegeId: COLLEGE, userId: 'user-101' };

    // CONFESS policy allows 5 requests
    for (let i = 0; i < 5; i++) {
      const res = limiter.checkLimit(dimension, 'CONFESS');
      expect(res.allowed).toBe(true);
    }

    const exceeded = limiter.checkLimit(dimension, 'CONFESS');
    expect(exceeded.allowed).toBe(false);
    expect(exceeded.remaining).toBe(0);
  });

  it('4. should index and search using Meilisearch and OpenSearch providers', async () => {
    const meili = new MeilisearchProvider();
    const openSearch = new OpenSearchProvider();

    const doc = { id: 'c1', collegeId: COLLEGE, title: 'OS Exam Tips', content: 'Semaphore deadlock avoidance', categoryCode: 'academic' };

    await meili.index(doc);
    await openSearch.index(doc);

    const meiliRes = await meili.search(COLLEGE, 'Semaphore');
    const openRes = await openSearch.search(COLLEGE, 'Semaphore');

    expect(meiliRes.length).toBe(1);
    expect(openRes.length).toBe(1);
  });

  it('5. should score toxicity and recommend action in AI Moderation provider', async () => {
    const ai = new MockAiModerationProvider();
    const cleanScore = await ai.analyzeContent('Clean study notes for physics');
    expect(cleanScore.recommendedAction).toBe('ALLOW');

    const toxicScore = await ai.analyzeContent('I hate this professor so much');
    expect(toxicScore.recommendedAction).toBe('QUARANTINE');
    expect(toxicScore.toxicityScore).toBeGreaterThan(0.9);
  });

  it('6. should return production health dashboard status from HealthCheckService', async () => {
    const health = new HealthCheckService();
    const status = await health.getHealthStatus();

    expect(status.status).toBe('HEALTHY');
    expect(status.components.database).toBe('UP');
    expect(status.components.anonymousIdentityBoundary).toBe('SECURE');
  });

  it('7. should record Prometheus metrics and compute SLO targets', () => {
    const metrics = new PrometheusMetricsService();
    metrics.recordRequest(15, 200);
    metrics.recordRequest(25, 200);
    metrics.recordRequest(120, 500);

    const promOutput = metrics.getMetricsPrometheusFormat();
    expect(promOutput).toContain('confession_http_requests_total 3');
    expect(promOutput).toContain('confession_http_errors_total 1');

    const slos = metrics.getSloMetrics();
    expect(slos.length).toBe(2);
  });

  it('8. Chaos Test: worker failures and queue backlog resilience under fault injection', async () => {
    const dlq = new DlqManager({ maxAttempts: 3 });
    const router = new EventRouter({ dlqManager: dlq });

    let successCount = 0;
    router.registerWorker('FaultyWorker', async (p) => {
      if (p['faulty'] === true) {
        throw new Error('CHAOS_INJECTED_FAULT');
      }
      successCount++;
    });
    router.registry.register('ChaosEvent', ['FaultyWorker']);

    // Dispatch mix of normal and faulty events
    for (let i = 0; i < 20; i++) {
      await router.publish('ChaosEvent', {
        eventId: `chaos-evt-${i}`,
        faulty: i % 2 === 0
      });
    }

    expect(successCount).toBe(10);
    expect(dlq.getDeadLetters().length).toBe(10);
  });
});
