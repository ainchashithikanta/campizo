/**
 * Campus Connect — Recovery Suite Integration Tests (MS-23.8.5)
 * Verifies RollbackManager audit logging, SnapshotRecovery HMAC integrity, EventReplayer ordering, and CacheRecovery rebuilding.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RollbackManager } from '../src/resilience/rollback-manager.js';
import { SnapshotRecovery } from '../src/resilience/snapshot-recovery.js';
import { EventReplayer } from '../src/resilience/event-replayer.js';
import { CacheRecovery } from '../src/resilience/cache-recovery.js';

import { EventRouter } from '../src/events/event-router.js';
import { buildEventEnvelope } from '../src/events/event-envelope.js';
import { ConnectUseCases, StudentIntentService, EventPublisher } from '../src/use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../src/queries/connect.queries.js';
import { InMemoryConnectRepositoryProvider } from '../src/repositories/in-memory-connect.repository.js';

describe('Campus Connect System Recovery Suite', () => {
  let repoProvider: InMemoryConnectRepositoryProvider;
  let eventPublisher: EventPublisher;
  let intentService: StudentIntentService;
  let useCases: ConnectUseCases;
  let queryService: ConnectQueryService;
  let router: EventRouter;

  beforeEach(() => {
    repoProvider = new InMemoryConnectRepositoryProvider();
    eventPublisher = new EventPublisher();
    intentService = new StudentIntentService(repoProvider, eventPublisher);
    useCases = new ConnectUseCases(repoProvider, eventPublisher, intentService);
    queryService = new ConnectQueryService(repoProvider);
    router = new EventRouter();
  });

  it('1. RollbackManager: Executes recommendation rollback and emits structured audit logs', async () => {
    const rollbackMgr = new RollbackManager(useCases);
    const auditEntry = await rollbackMgr.rollbackRecommendation('rec_snapshot_100', 'college_stanford_001', 'ALGORITHM_REPLAY_CORRECTION');

    expect(auditEntry.rollbackId).toBeDefined();
    expect(auditEntry.targetType).toBe('RECOMMENDATION');
    expect(auditEntry.targetId).toBe('rec_snapshot_100');
    expect(rollbackMgr.getAuditLogs().length).toBe(1);
  });

  it('2. SnapshotRecovery: Verifies HMAC checksum integrity and performs point-in-time recovery', () => {
    const recovery = new SnapshotRecovery();
    const payload = { sourceStudentId: 'usr_1', targetStudentId: 'usr_2', score: 95.0 };

    const snapshot = recovery.createProtectedSnapshot('snap_1', 'college_stanford_001', payload);

    expect(recovery.verifySnapshotIntegrity(snapshot)).toBe(true);

    // Tamper with payload
    snapshot.data['score'] = 999.0;
    expect(recovery.verifySnapshotIntegrity(snapshot)).toBe(false);
  });

  it('3. EventReplayer: Replays events by version & timestamp without side-effect duplication', async () => {
    const replayer = new EventReplayer(router);
    let handledCount = 0;

    router.subscribe('TestEvent', async () => {
      handledCount++;
    });

    const events = [
      buildEventEnvelope('TestEvent', { id: 1 }, { eventId: 'evt_1', timestamp: '2026-08-04T10:00:00.000Z', version: 1 }),
      buildEventEnvelope('TestEvent', { id: 2 }, { eventId: 'evt_2', timestamp: '2026-08-04T11:00:00.000Z', version: 2 })
    ];

    const count = await replayer.replayByVersion(events, 1);
    expect(count).toBe(2);
    expect(handledCount).toBe(2);

    // Second replay attempt skips duplicate execution via idempotency
    const secondCount = await replayer.replayByVersion(events, 1);
    expect(secondCount).toBe(0);
    expect(handledCount).toBe(2);
  });

  it('4. CacheRecovery: Rebuilds L1, Redis, and recommendation caches from database source of truth', async () => {
    const cacheRecovery = new CacheRecovery(queryService);
    const summary = await cacheRecovery.rebuildAllCaches('college_stanford_001');

    expect(summary.rebuiltDiscoveryItems).toBeGreaterThan(0);
    expect(summary.durationMs).toBeLessThan(500);
    expect(cacheRecovery.getL1Item('l1:college_stanford_001:discovery:int_101')).toBeDefined();
  });
});
