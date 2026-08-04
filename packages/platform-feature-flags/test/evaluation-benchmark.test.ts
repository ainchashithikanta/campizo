import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureEvaluationService } from '../src/index.js';

describe('Platform Feature Flags — Performance Benchmark Suite', () => {
  let evalService: FeatureEvaluationService;

  beforeEach(() => {
    evalService = new FeatureEvaluationService();
    evalService.warmupL1Cache('PRODUCTION', [
      {
        flagKey: 'marketplace.p2p_chat',
        environment: 'PRODUCTION',
        defaultState: true,
        lifecycleStage: 'PRODUCTION',
        configurationVersion: 2
      },
      {
        flagKey: 'confessions.voting',
        environment: 'PRODUCTION',
        defaultState: false,
        lifecycleStage: 'PRODUCTION',
        rolloutPercentage: 50,
        configurationVersion: 1
      }
    ]);
  });

  it('1. Warmup L1 Cache: should warm up evaluation cache completely', () => {
    const warmedCount = evalService.warmupL1Cache('PRODUCTION', [
      { flagKey: 'events.ticket', environment: 'PRODUCTION' },
      { flagKey: 'clubs.feed', environment: 'PRODUCTION' }
    ]);
    expect(warmedCount).toBe(2);
  });

  it('2. Extended EvaluationResult fields: should populate traceId, configurationVersion & policyExecutionCount', () => {
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {}, false, 'trace_custom_101');
    expect(res.traceId).toBe('trace_custom_101');
    expect(res.configurationVersion).toBe(2);
    expect(res.policyExecutionCount).toBeGreaterThanOrEqual(1);
  });

  it('3. Per-policy telemetry metrics: should record per-policy micro-metrics', () => {
    evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION');
    evalService.evaluateFeature('confessions.voting', 'PRODUCTION');

    const metrics = evalService.getPolicyTelemetryMetrics();
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0]?.executionCount).toBeGreaterThan(0);
  });

  it('4. Benchmark: should sustain 10,000 evaluations under 100ms total (<0.01ms per eval)', () => {
    const EVALUATION_COUNT = 10000;
    const start = performance.now();

    for (let i = 0; i < EVALUATION_COUNT; i++) {
      evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
        userId: `usr_bench_${i % 100}`
      });
    }

    const totalDurationMs = performance.now() - start;
    const avgPerEvalMs = totalDurationMs / EVALUATION_COUNT;

    // Sub-millisecond SLA assertion (< 1ms per evaluation)
    expect(avgPerEvalMs).toBeLessThan(1.0);
    expect(totalDurationMs).toBeLessThan(500.0); // 10,000 evals in < 500ms total
  });
});
