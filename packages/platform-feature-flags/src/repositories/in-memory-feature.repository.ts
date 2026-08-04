/**
 * Production-Equivalent In-Memory Feature Repositories
 * Exposes repository interface contracts for testing with zero database dependencies.
 * Supports optimistic locking, append-only audit tracking, and event publication after commit.
 */

import {
  FeatureFlagEntity,
  FeatureFlagRepository,
  KillSwitchEntity,
  KillSwitchRepository,
  FeatureAuditLogEntity,
  FeatureAuditLogRepository
} from '../domain/repository.interface.js';
import { ConflictApplicationError } from '../errors/application-errors.js';
import { PlatformFeatureFlagDomainEvent } from '../domain/events.js';

export class InMemoryFeatureFlagRepository implements FeatureFlagRepository {
  private readonly flags: Map<string, FeatureFlagEntity> = new Map();
  private readonly publishedEvents: PlatformFeatureFlagDomainEvent[] = [];

  /** Expected complexity: O(1) */
  async findByKey(flagKey: string, environment: string = 'PRODUCTION'): Promise<FeatureFlagEntity | null> {
    const key = `${environment}:${flagKey}`;
    const item = this.flags.get(key);
    return item ? { ...item } : null;
  }

  /** Expected complexity: O(N) */
  async findAll(environment: string = 'PRODUCTION'): Promise<FeatureFlagEntity[]> {
    return Array.from(this.flags.values())
      .filter((f) => f.environment === environment)
      .map((f) => ({ ...f }));
  }

  /** Expected complexity: O(1) */
  async save(flag: Omit<FeatureFlagEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlagEntity> {
    const key = `${flag.environment}:${flag.flagKey}`;
    const existing = this.flags.get(key);

    if (existing && flag.version !== existing.version + 1 && flag.version !== existing.version) {
      throw new ConflictApplicationError(
        `Optimistic lock collision for flag '${flag.flagKey}'. Expected version ${existing.version + 1}, got ${flag.version}.`
      );
    }

    const entity: FeatureFlagEntity = {
      id: existing ? existing.id : `flag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      flagKey: flag.flagKey,
      environment: flag.environment,
      defaultState: flag.defaultState,
      lifecycleStage: flag.lifecycleStage,
      version: flag.version,
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date()
    };

    this.flags.set(key, entity);
    return { ...entity };
  }

  /** Expected complexity: O(1) */
  async updateState(flagKey: string, environment: string, enabled: boolean): Promise<void> {
    const entity = await this.findByKey(flagKey, environment);
    if (!entity) return;
    entity.defaultState = enabled;
    entity.version += 1;
    entity.updatedAt = new Date();
    this.flags.set(`${environment}:${flagKey}`, entity);
  }

  /** Expected complexity: O(1) */
  async updateLifecycle(flagKey: string, stage: string): Promise<void> {
    for (const [k, entity] of this.flags.entries()) {
      if (entity.flagKey === flagKey) {
        entity.lifecycleStage = stage;
        entity.version += 1;
        entity.updatedAt = new Date();
        this.flags.set(k, entity);
      }
    }
  }

  publishEventAfterCommit(event: PlatformFeatureFlagDomainEvent): void {
    this.publishedEvents.push(event);
  }

  getPublishedEvents(): PlatformFeatureFlagDomainEvent[] {
    return [...this.publishedEvents];
  }
}

export class InMemoryKillSwitchRepository implements KillSwitchRepository {
  private readonly killSwitches: Map<string, KillSwitchEntity> = new Map();

  /** Expected complexity: O(1) */
  async findActive(flagKey: string): Promise<KillSwitchEntity | null> {
    const item = this.killSwitches.get(flagKey);
    return item && item.isActive ? { ...item } : null;
  }

  /** Expected complexity: O(1) */
  async activate(flagKey: string, operatorUserId: string, reason: string): Promise<KillSwitchEntity> {
    const entity: KillSwitchEntity = {
      id: `ks_${Date.now()}`,
      flagKey,
      isActive: true,
      emergencyReason: reason,
      operatorUserId,
      trippedAt: new Date()
    };
    this.killSwitches.set(flagKey, entity);
    return { ...entity };
  }

  /** Expected complexity: O(1) */
  async deactivate(flagKey: string, _operatorUserId: string): Promise<void> {
    const item = this.killSwitches.get(flagKey);
    if (item) {
      item.isActive = false;
      item.releasedAt = new Date();
      this.killSwitches.set(flagKey, item);
    }
  }
}

export class InMemoryAuditLogRepository implements FeatureAuditLogRepository {
  private readonly logs: FeatureAuditLogEntity[] = [];

  /** Expected complexity: O(1) */
  async appendLog(log: Omit<FeatureAuditLogEntity, 'id' | 'createdAt'>): Promise<FeatureAuditLogEntity> {
    const entity: FeatureAuditLogEntity = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      ...log,
      createdAt: new Date()
    };
    this.logs.push(entity);
    return { ...entity };
  }

  /** Expected complexity: O(N) */
  async listLogsForFlag(flagKey: string, limit: number = 50): Promise<FeatureAuditLogEntity[]> {
    return this.logs
      .filter((l) => l.flagKey === flagKey)
      .slice(-limit)
      .map((l) => ({ ...l }));
  }
}
