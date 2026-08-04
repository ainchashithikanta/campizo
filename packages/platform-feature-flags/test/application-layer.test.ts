import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryFeatureFlagRepository,
  InMemoryKillSwitchRepository,
  InMemoryAuditLogRepository,
  FeatureQueries,
  FeatureUseCases,
  ConflictApplicationError,
  NotFoundApplicationError,
  PlatformFeatureFlagDomainEvent
} from '../src/index.js';

describe('Platform Feature Flags — Application Layer Suite', () => {
  let flagRepo: InMemoryFeatureFlagRepository;
  let killSwitchRepo: InMemoryKillSwitchRepository;
  let auditRepo: InMemoryAuditLogRepository;
  let publishedEvents: PlatformFeatureFlagDomainEvent[];
  let queries: FeatureQueries;
  let useCases: FeatureUseCases;

  beforeEach(() => {
    flagRepo = new InMemoryFeatureFlagRepository();
    killSwitchRepo = new InMemoryKillSwitchRepository();
    auditRepo = new InMemoryAuditLogRepository();
    publishedEvents = [];

    const eventPublisher = (evt: PlatformFeatureFlagDomainEvent) => {
      publishedEvents.push(evt);
    };

    queries = new FeatureQueries(flagRepo, killSwitchRepo);
    useCases = new FeatureUseCases(flagRepo, killSwitchRepo, auditRepo, eventPublisher);
  });

  // ── 1. Use Cases & Transactions Tests ─────────────────────────────────

  describe('Command Use Cases', () => {
    it('should create a feature flag and publish FeatureCreated event AFTER commit', async () => {
      const created = await useCases.createFeature({
        flagKey: 'marketplace.p2p_chat',
        environment: 'PRODUCTION',
        defaultState: false,
        ownerTeam: 'Team Marketplace',
        operatorUserId: 'user_admin_1'
      });

      expect(created.flagKey).toBe('marketplace.p2p_chat');
      expect(created.version).toBe(1);

      // Verify event publication AFTER commit
      expect(publishedEvents.length).toBe(1);
      expect(publishedEvents[0]?.eventType).toBe('FeatureCreated');
      expect(publishedEvents[0]?.flagKey).toBe('marketplace.p2p_chat');

      // Verify audit log entry
      const logs = await auditRepo.listLogsForFlag('marketplace.p2p_chat');
      expect(logs.length).toBe(1);
      expect(logs[0]?.actionType).toBe('CREATE_FEATURE');
    });

    it('should enable and disable a feature flag emitting typed domain events', async () => {
      await useCases.createFeature({
        flagKey: 'confessions.voting',
        ownerTeam: 'Team Confessions',
        operatorUserId: 'user_admin_1'
      });

      await useCases.enableFeature('confessions.voting', 'PRODUCTION', 'user_admin_1');
      const flag = await queries.getFeature('confessions.voting', 'PRODUCTION');
      expect(flag.defaultState).toBe(true);

      await useCases.disableFeature('confessions.voting', 'PRODUCTION', 'user_admin_1');
      const disabledFlag = await queries.getFeature('confessions.voting', 'PRODUCTION');
      expect(disabledFlag.defaultState).toBe(false);

      expect(publishedEvents.some((e) => e.eventType === 'FeatureEnabled')).toBe(true);
      expect(publishedEvents.some((e) => e.eventType === 'FeatureDisabled')).toBe(true);
    });

    it('should enforce optimistic locking on concurrent updates', async () => {
      await useCases.createFeature({
        flagKey: 'events.ticketing',
        ownerTeam: 'Team Events',
        operatorUserId: 'user_admin_1'
      });

      // Valid save at version 1 -> version 1
      await flagRepo.save({
        flagKey: 'events.ticketing',
        environment: 'PRODUCTION',
        defaultState: true,
        lifecycleStage: 'DRAFT',
        version: 1
      });

      // Invalid collision save (version jumps to 99)
      await expect(
        flagRepo.save({
          flagKey: 'events.ticketing',
          environment: 'PRODUCTION',
          defaultState: true,
          lifecycleStage: 'DRAFT',
          version: 99
        })
      ).rejects.toThrow(ConflictApplicationError);
    });

    it('should activate and release emergency kill switches emitting high-priority events', async () => {
      const ks = await useCases.activateKillSwitch('marketplace.payment', 'Database latency spike', 'op_101');
      expect(ks.isActive).toBe(true);

      const active = await killSwitchRepo.findActive('marketplace.payment');
      expect(active).not.toBeNull();

      await useCases.releaseKillSwitch('marketplace.payment', 'op_101');
      const released = await killSwitchRepo.findActive('marketplace.payment');
      expect(released).toBeNull();

      expect(publishedEvents.some((e) => e.eventType === 'KillSwitchActivated')).toBe(true);
      expect(publishedEvents.some((e) => e.eventType === 'KillSwitchReleased')).toBe(true);
    });

    it('should create and restore configuration snapshots', async () => {
      const snap = await useCases.createSnapshot('PRODUCTION', 'Pre-release backup', 'op_101');
      expect(snap.snapshotId).toContain('snap_');

      const restored = await useCases.restoreSnapshot(snap.snapshotId, 'PRODUCTION', 'op_101');
      expect(restored.restored).toBe(true);

      expect(publishedEvents.some((e) => e.eventType === 'SnapshotCreated')).toBe(true);
      expect(publishedEvents.some((e) => e.eventType === 'SnapshotRestored')).toBe(true);
    });
  });

  // ── 2. CQRS Read Queries Tests ───────────────────────────────────────

  describe('CQRS Read Queries', () => {
    it('should return operational dashboard metrics and topology', async () => {
      await useCases.createFeature({
        flagKey: 'clubs.directory',
        ownerTeam: 'Team Clubs',
        operatorUserId: 'user_admin_1'
      });

      const dashboard = await queries.getDashboard('PRODUCTION');
      expect(dashboard.totalFlags).toBe(1);
      expect(dashboard.environment).toBe('PRODUCTION');

      const topology = await queries.getTopology();
      expect(topology.modules.length).toBeGreaterThan(0);

      const health = await queries.getHealth();
      expect(health.status).toBe('HEALTHY');
    });

    it('should throw NotFoundApplicationError when feature key does not exist', async () => {
      await expect(queries.getFeature('non_existent_key', 'PRODUCTION')).rejects.toThrow(NotFoundApplicationError);
    });
  });
});
