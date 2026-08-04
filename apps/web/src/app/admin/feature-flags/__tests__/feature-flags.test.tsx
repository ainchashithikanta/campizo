import { describe, it, expect } from 'vitest';
import { featureFlagsApi } from '@web/lib/api-feature-flags';

describe('Platform Feature Flags — Next.js 16 Frontend Suite', () => {
  it('1. API Client: getHealth() should return HEALTHY platform status', async () => {
    const health = await featureFlagsApi.getHealth();
    expect(health.status).toBe('HEALTHY');
    expect(health.redisConnected).toBe(true);
    expect(health.databaseConnected).toBe(true);
  });

  it('2. API Client: evaluateFeature() should return EvaluationResultDto with traceId', async () => {
    const res = await featureFlagsApi.evaluateFeature('marketplace.p2p_chat', { userId: 'usr_test_1' });
    expect(res.enabled).toBe(true);
    expect(res.traceId).toBeDefined();
    expect(res.traceId).toContain('trace_');
    expect(res.evaluationTimeMs).toBeLessThan(1.0);
  });

  it('3. API Client: listFlags() should return feature flag DTO list', async () => {
    const list = await featureFlagsApi.listFlags();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]?.flagKey).toBe('marketplace.p2p_chat');
  });
});
