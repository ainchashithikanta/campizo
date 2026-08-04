import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureEvaluationService,
  PolicyEngine,
  KillSwitchPolicy,
  MaintenancePolicy,
  DependencyPolicy,
  LifecyclePolicy,
  VersionPolicy,
  EnvironmentPolicy,
  PackPolicy,
  TemplatePolicy,
  OverridePolicy,
  RolloutPolicy
} from '../src/index.js';

describe('Platform Feature Flags — Evaluation Engine & Policy Suite', () => {
  let evalService: FeatureEvaluationService;

  beforeEach(() => {
    evalService = new FeatureEvaluationService();
    evalService.preloadL1Cache([
      {
        flagKey: 'marketplace.p2p_chat',
        environment: 'PRODUCTION',
        defaultState: true,
        lifecycleStage: 'PRODUCTION'
      },
      {
        flagKey: 'confessions.voting',
        environment: 'PRODUCTION',
        defaultState: false,
        lifecycleStage: 'PRODUCTION',
        rolloutPercentage: 50
      }
    ]);
  });

  it('1. KillSwitchPolicy: should short-circuit with enabled: false when kill switch is active', () => {
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      isKillSwitchActive: true
    });
    expect(res.enabled).toBe(false);
    expect(res.reason).toBe('KILL_SWITCH_ACTIVE');
    expect(res.matchedRule).toBe('KillSwitchPolicy');
  });

  it('2. MaintenancePolicy: should short-circuit when module maintenance is active', () => {
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      isMaintenanceActive: true
    });
    expect(res.enabled).toBe(false);
    expect(res.reason).toBe('MAINTENANCE_WINDOW_ACTIVE');
    expect(res.matchedRule).toBe('MaintenancePolicy');
  });

  it('3. DependencyPolicy: should disable flag if prerequisite dependency is missing', () => {
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      unmetDependencies: ['identity.auth']
    });
    expect(res.enabled).toBe(false);
    expect(res.reason).toContain('UNMET_PREREQUISITE_DEPENDENCY');
    expect(res.matchedRule).toBe('DependencyPolicy');
  });

  it('4. LifecyclePolicy: should block REMOVED or DRAFT flags', () => {
    const resRemoved = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      lifecycleStage: 'REMOVED'
    });
    expect(resRemoved.enabled).toBe(false);
    expect(resRemoved.reason).toBe('FEATURE_STAGE_REMOVED');

    const resDraft = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      lifecycleStage: 'DRAFT'
    });
    expect(resDraft.enabled).toBe(false);
    expect(resDraft.reason).toBe('FEATURE_STAGE_DRAFT');
  });

  it('5. VersionPolicy: should block client app version lower than minimum required', () => {
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      minAppVersion: '2.0.0',
      clientAppVersion: '1.5.0'
    });
    expect(res.enabled).toBe(false);
    expect(res.reason).toContain('CLIENT_VERSION_UNMET');
  });

  it('6. EnvironmentPolicy: should block if target environment is explicitly disabled', () => {
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'STAGING', {
      disabledEnvironments: ['STAGING']
    });
    expect(res.enabled).toBe(false);
    expect(res.reason).toContain('ENVIRONMENT_DISABLED');
  });

  it('7. PackPolicy & TemplatePolicy: should enforce pack and template state overrides', () => {
    const packRes = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      packOverrideState: true
    });
    expect(packRes.enabled).toBe(true);
    expect(packRes.reason).toBe('PACK_OVERRIDE_ENABLED');

    const tplRes = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      templateEnforcedState: false
    });
    expect(tplRes.enabled).toBe(false);
    expect(tplRes.reason).toBe('TEMPLATE_ENFORCED_DISABLED');
  });

  it('8. OverridePolicy: should evaluate User > Role > College hierarchy', () => {
    // User override wins
    const userRes = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      userId: 'usr_123',
      userOverrides: { usr_123: true },
      collegeId: 'stanford',
      collegeOverrides: { stanford: false }
    });
    expect(userRes.enabled).toBe(true);
    expect(userRes.reason).toBe('USER_OVERRIDE_MATCH');

    // College override applies if no user override
    const collegeRes = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION', {
      collegeId: 'stanford',
      collegeOverrides: { stanford: false }
    });
    expect(collegeRes.enabled).toBe(false);
    expect(collegeRes.reason).toBe('COLLEGE_OVERRIDE_MATCH');
  });

  it('9. RolloutPolicy: should evaluate deterministic percentage buckets', () => {
    const res = evalService.evaluateFeature('confessions.voting', 'PRODUCTION', {
      userId: 'usr_student_999'
    });
    expect(typeof res.enabled).toBe('boolean');
    expect(res.matchedRule).toContain('RolloutPolicy');
  });

  it('10. Execution Latency Target: should execute in < 1ms local in-memory latency', () => {
    const res = evalService.evaluateFeature('marketplace.p2p_chat', 'PRODUCTION');
    expect(res.evaluationTimeMs).toBeLessThan(1.0);
    expect(res.cacheSource).toBe('LOCAL_MEMORY');
  });

  it('11. Dry-run and simulation mode should evaluate accurately', () => {
    const dry = evalService.dryRun('marketplace.p2p_chat', 'PRODUCTION', { defaultState: true });
    expect(dry.explanation).toBeDefined();
    expect(dry.explanation?.skippedRules.length).toBeGreaterThan(0);

    const sim = evalService.simulate('confessions.voting', 'PRODUCTION', ['u1', 'u2', 'u3', 'u4'], 50);
    expect(sim.totalCount).toBe(4);
  });
});
