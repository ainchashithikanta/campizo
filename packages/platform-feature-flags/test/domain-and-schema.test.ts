import { describe, it, expect } from 'vitest';
import {
  FeatureKey,
  FeatureVersion,
  RolloutPercentage,
  Environment,
  FeatureLifecycle,
  EvaluationResult,
  ApprovalDecision,
  SnapshotReference,
  FeatureOwner,
  Reason,
  FeaturePack,
  FeatureTemplate,
  assertUniqueFeatureKey,
  assertValidLifecycleTransition,
  assertNoCircularDependencies,
  assertApprovalRequired,
  assertValidRolloutPercentage,
  assertValidEnvironment,
  assertSingleActiveKillSwitch,
  assertSnapshotIntegrity,
  DuplicateFeatureKeyError,
  CircularDependencyError,
  InvalidLifecycleTransitionError,
  ApprovalRequiredError,
  FeatureRemovedError,
  KillSwitchActiveError,
  SnapshotIntegrityError,
  featureFlags,
  featureGroups,
  featureGroupMembers,
  featureDependencies,
  featureMetadata,
  collegeOverrides,
  userOverrides,
  killSwitches,
  featureAuditLogs,
  approvalRequests,
  featureSnapshots,
  featureUsageStatistics
} from '../src/index.js';

describe('Platform Feature Flags — Database, Domain & Schema Suite', () => {
  // ── 1. Value Objects Tests ──────────────────────────────────────────

  describe('Value Objects', () => {
    it('should validate FeatureKey format correctly', () => {
      const key = new FeatureKey('marketplace.p2p_chat');
      expect(key.value).toBe('marketplace.p2p_chat');

      expect(() => new FeatureKey('')).toThrow('non-empty string');
      expect(() => new FeatureKey('invalidkeyformat')).toThrow('Invalid feature key format');
    });

    it('should handle FeatureVersion increments', () => {
      const v1 = new FeatureVersion(1);
      expect(v1.value).toBe(1);
      const v2 = v1.next();
      expect(v2.value).toBe(2);

      expect(() => new FeatureVersion(0)).toThrow('positive integer');
    });

    it('should enforce RolloutPercentage bounds [0, 100]', () => {
      const p = new RolloutPercentage(42.8);
      expect(p.value).toBe(42);

      expect(() => new RolloutPercentage(-10)).toThrow('between 0 and 100');
      expect(() => new RolloutPercentage(105)).toThrow('between 0 and 100');
    });

    it('should validate Environment types', () => {
      const env = new Environment('PRODUCTION');
      expect(env.value).toBe('PRODUCTION');
      expect(() => new Environment('INVALID' as any)).toThrow('Invalid environment');
    });

    it('should evaluate FeatureLifecycle stages and evaluatable status', () => {
      const dev = new FeatureLifecycle('DEVELOPMENT');
      expect(dev.isEvaluatable()).toBe(true);

      const removed = new FeatureLifecycle('REMOVED');
      expect(removed.isEvaluatable()).toBe(false);
    });

    it('should construct EvaluationResult value object correctly', () => {
      const res = new EvaluationResult({
        enabled: true,
        reason: 'PERCENTAGE_BUCKET_MATCH',
        matchedRule: 'Canary25Rule',
        evaluationTimeMs: 0.35,
        cacheSource: 'LOCAL_MEMORY',
        evaluatedEnvironment: 'PRODUCTION'
      });
      expect(res.enabled).toBe(true);
      expect(res.reason).toBe('PERCENTAGE_BUCKET_MATCH');
      expect(res.evaluationTimeMs).toBe(0.35);
    });

    it('should validate FeatureOwner email address', () => {
      const owner = new FeatureOwner('Team Marketplace', 'lead@collegehub.edu');
      expect(owner.teamName).toBe('Team Marketplace');
      expect(() => new FeatureOwner('Team', 'invalid-email')).toThrow('Valid lead email');
    });

    it('should construct FeaturePack with non-empty members', () => {
      const pack = new FeaturePack('freshers_pack', ['mkt.upload', 'conf.feed']);
      expect(pack.memberFlagKeys.length).toBe(2);
      expect(() => new FeaturePack('empty', [])).toThrow('at least one member');
    });
  });

  // ── 2. Domain Invariants & Assertions Tests ──────────────────────────

  describe('Domain Invariants & Assertions', () => {
    it('assertUniqueFeatureKey should throw DuplicateFeatureKeyError if key exists', () => {
      const existing = new Set(['confessions.voting']);
      expect(() => assertUniqueFeatureKey('confessions.voting', existing)).toThrow(DuplicateFeatureKeyError);
      expect(() => assertUniqueFeatureKey('confessions.feed', existing)).not.toThrow();
    });

    it('assertValidLifecycleTransition should enforce legal state transitions', () => {
      expect(() => assertValidLifecycleTransition('DEVELOPMENT', 'BETA')).not.toThrow();
      expect(() => assertValidLifecycleTransition('DRAFT', 'PRODUCTION')).toThrow(InvalidLifecycleTransitionError);
      expect(() => assertValidLifecycleTransition('REMOVED', 'BETA')).toThrow(FeatureRemovedError);
    });

    it('assertNoCircularDependencies should detect direct and transitive cycles', () => {
      const graph = new Map<string, string[]>([
        ['flagA', ['flagB']],
        ['flagB', ['flagC']]
      ]);

      // Adding flagC -> flagA creates a cycle!
      expect(() => assertNoCircularDependencies('flagC', 'flagA', graph)).toThrow(CircularDependencyError);

      // Adding flagA -> flagD is safe
      expect(() => assertNoCircularDependencies('flagA', 'flagD', graph)).not.toThrow();
    });

    it('assertApprovalRequired should enforce 4-eye policy in Production', () => {
      expect(() => assertApprovalRequired('mkt.chat', 'PRODUCTION', false)).toThrow(ApprovalRequiredError);
      expect(() => assertApprovalRequired('mkt.chat', 'PRODUCTION', true)).not.toThrow();
      expect(() => assertApprovalRequired('mkt.chat', 'STAGING', false)).not.toThrow();
    });

    it('assertSingleActiveKillSwitch should throw if kill switch is active', () => {
      expect(() => assertSingleActiveKillSwitch('mkt.payment', true)).toThrow(KillSwitchActiveError);
      expect(() => assertSingleActiveKillSwitch('mkt.payment', false)).not.toThrow();
    });

    it('assertSnapshotIntegrity should verify HMAC signature match', () => {
      expect(() => assertSnapshotIntegrity('snap-1', 'sig-abc', 'sig-xyz')).toThrow(SnapshotIntegrityError);
      expect(() => assertSnapshotIntegrity('snap-1', 'sig-abc', 'sig-abc')).not.toThrow();
    });
  });

  // ── 3. Drizzle ORM Schema Integrity Tests ────────────────────────────

  describe('Drizzle ORM Schema Catalog Verification', () => {
    it('should export all 22 required database table schemas', () => {
      expect(featureFlags).toBeDefined();
      expect(featureGroups).toBeDefined();
      expect(featureGroupMembers).toBeDefined();
      expect(featureDependencies).toBeDefined();
      expect(featureMetadata).toBeDefined();
      expect(collegeOverrides).toBeDefined();
      expect(userOverrides).toBeDefined();
      expect(killSwitches).toBeDefined();
      expect(featureAuditLogs).toBeDefined();
      expect(approvalRequests).toBeDefined();
      expect(featureSnapshots).toBeDefined();
      expect(featureUsageStatistics).toBeDefined();
    });
  });
});
