import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlagStore, FeatureFlagEngine, FeatureFlagCache } from '../src/index.js';

describe('Tenant Feature Flag Engine', () => {
  let store: FeatureFlagStore;
  let cache: FeatureFlagCache;
  let engine: FeatureFlagEngine;

  beforeEach(() => {
    store = new FeatureFlagStore();
    cache = new FeatureFlagCache(5000);
    engine = new FeatureFlagEngine(store, cache);
  });

  it('should return false as safe default for missing flag keys', () => {
    const isEnabled = engine.isEnabled('non-existent-flag');
    expect(isEnabled).toBe(false);
  });

  it('should evaluate per-college target whitelists', () => {
    store.setFlag({
      key: 'beta:ai-tutor',
      description: 'AI Tutor Feature',
      enabled: true,
      environments: ['development', 'production', 'test'],
      collegeIds: ['college-stanford-001']
    });

    expect(engine.isEnabled('beta:ai-tutor', { collegeId: 'college-stanford-001' })).toBe(true);
    expect(engine.isEnabled('beta:ai-tutor', { collegeId: 'college-mit-002' })).toBe(false);
  });

  it('should enforce environment constraints', () => {
    store.setFlag({
      key: 'feature:experimental-chat',
      description: 'Experimental Chat',
      enabled: true,
      environments: ['development']
    });

    expect(engine.isEnabled('feature:experimental-chat', { environment: 'development' })).toBe(true);
    expect(engine.isEnabled('feature:experimental-chat', { environment: 'production' })).toBe(false);
  });

  it('should evaluate feature flag prerequisites', () => {
    store.setFlag({
      key: 'mod:base-auth',
      description: 'Base Authentication',
      enabled: false
    });

    store.setFlag({
      key: 'mod:advanced-security',
      description: 'Advanced Security Module',
      enabled: true,
      prerequisites: ['mod:base-auth']
    });

    // Dependent flag should evaluate to false because prerequisite is disabled
    expect(engine.isEnabled('mod:advanced-security')).toBe(false);

    // Enable prerequisite
    store.setFlag({
      key: 'mod:base-auth',
      description: 'Base Authentication',
      enabled: true
    });
    cache.clear();

    expect(engine.isEnabled('mod:advanced-security')).toBe(true);
  });

  it('should evaluate deterministic percentage rollouts', () => {
    store.setFlag({
      key: 'experiment:new-ui',
      description: 'New UI Layout Experiment',
      enabled: true,
      percentageRollout: 50
    });

    const isEnabledForColA = engine.isEnabled('experiment:new-ui', { collegeId: 'stanford-1' });
    const isEnabledForColASecondCall = engine.isEnabled('experiment:new-ui', { collegeId: 'stanford-1' });

    // Deterministic hashing guarantee: same input ALWAYS returns same output
    expect(isEnabledForColA).toBe(isEnabledForColASecondCall);
  });

  it('should record audit history and support rule rollback', () => {
    store.setFlag({
      key: 'flag:test-rollback',
      description: 'Test Rollback',
      enabled: true
    });

    store.setFlag({
      key: 'flag:test-rollback',
      description: 'Test Rollback Updated',
      enabled: false
    });

    expect(store.getFlag('flag:test-rollback')?.enabled).toBe(false);

    const rolledBack = store.rollbackFlag('flag:test-rollback', 1);
    expect(rolledBack).toBe(true);
    expect(store.getFlag('flag:test-rollback')?.enabled).toBe(true);
  });
});
