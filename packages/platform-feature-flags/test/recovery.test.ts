import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureEvaluationService,
  CacheRebuilder,
  SnapshotRecovery,
  RollbackManager,
  InMemoryFeatureFlagRepository,
  InMemoryKillSwitchRepository,
  InMemoryAuditLogRepository,
  FeatureUseCases
} from '../src/index.js';

describe('Platform Feature Flags — Production Recovery & Rollback Suite', () => {

  let evalService: FeatureEvaluationService;
  let cacheRebuilder: CacheRebuilder;
  let snapshotRecovery: SnapshotRecovery;
  let rollbackManager: RollbackManager;

  beforeEach(() => {
    evalService = new FeatureEvaluationService();
    cacheRebuilder = new CacheRebuilder(evalService);
    snapshotRecovery = new SnapshotRecovery();

    const flagRepo = new InMemoryFeatureFlagRepository();
    const ksRepo = new InMemoryKillSwitchRepository();
    const auditRepo = new InMemoryAuditLogRepository();
    const useCases = new FeatureUseCases(flagRepo, ksRepo, auditRepo);

    rollbackManager = new RollbackManager(useCases);
  });

  it('1. CacheRebuilder: should rebuild L1 memory cache from database source-of-truth', () => {
    const res = cacheRebuilder.rebuildL1Cache([
      {
        id: 'f1',
        flagKey: 'marketplace.p2p_chat',
        environment: 'PRODUCTION',
        defaultState: true,
        lifecycleStage: 'PRODUCTION',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    expect(res.rebuiltCount).toBe(1);
    expect(res.durationMs).toBeLessThan(50.0);
  });

  it('2. SnapshotRecovery: should restore configuration snapshot and verify HMAC integrity', async () => {
    const res = await snapshotRecovery.restoreSnapshot('snap_101', 'PRODUCTION', 'hmac_valid_sig');
    expect(res.restored).toBe(true);
    expect(res.flagCount).toBeGreaterThan(0);
  });

  it('3. RollbackManager: should execute automated emergency rollback to last known-good snapshot', async () => {
    const res = await rollbackManager.rollbackFailedRollout(
      'confessions.voting',
      'PRODUCTION',
      'snap_known_good_001',
      'admin_user_101'
    );

    expect(res.rolledBack).toBe(true);
    expect(res.restoredSnapshotId).toBeDefined();
  });
});
