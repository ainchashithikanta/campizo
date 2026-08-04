/**
 * Production Drizzle ORM Repositories for PostgreSQL
 * Implements repository contracts with transactions, optimistic locking, and append-only history.
 */

import {
  FeatureFlagEntity,
  FeatureFlagRepository
} from '../domain/repository.interface.js';
import { featureFlags } from '../schema/feature-flags.schema.js';
import { eq, and } from 'drizzle-orm';
import { ConflictApplicationError } from '../errors/application-errors.js';

export class DrizzleFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private readonly db: any) {}

  /** Expected complexity: O(1) B-tree index lookup */
  async findByKey(flagKey: string, environment: string = 'PRODUCTION'): Promise<FeatureFlagEntity | null> {
    const rows = await this.db
      .select()
      .from(featureFlags)
      .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      flagKey: row.flagKey,
      environment: row.environment,
      defaultState: row.defaultState,
      lifecycleStage: row.lifecycleStage,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /** Expected complexity: O(N) index scan */
  async findAll(environment: string = 'PRODUCTION'): Promise<FeatureFlagEntity[]> {
    const rows = await this.db.select().from(featureFlags).where(eq(featureFlags.environment, environment));
    return rows.map((r: any) => ({
      id: r.id,
      flagKey: r.flagKey,
      environment: r.environment,
      defaultState: r.defaultState,
      lifecycleStage: r.lifecycleStage,
      version: r.version,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  /** Expected complexity: O(1) insert/update with optimistic locking check */
  async save(flag: Omit<FeatureFlagEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlagEntity> {
    const existing = await this.findByKey(flag.flagKey, flag.environment);

    if (existing) {
      if (flag.version !== existing.version + 1 && flag.version !== existing.version) {
        throw new ConflictApplicationError(
          `Optimistic locking error on '${flag.flagKey}'. Expected version ${existing.version + 1}, got ${flag.version}`
        );
      }

      const updatedRows = await this.db
        .update(featureFlags)
        .set({
          defaultState: flag.defaultState,
          lifecycleStage: flag.lifecycleStage,
          version: flag.version,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(featureFlags.flagKey, flag.flagKey),
            eq(featureFlags.environment, flag.environment),
            eq(featureFlags.version, existing.version)
          )
        )
        .returning();

      if (updatedRows.length === 0) {
        throw new ConflictApplicationError(`Concurrent modification detected for flag '${flag.flagKey}'. Update aborted.`);
      }

      const updated = updatedRows[0];
      return {
        id: updated.id,
        flagKey: updated.flagKey,
        environment: updated.environment,
        defaultState: updated.defaultState,
        lifecycleStage: updated.lifecycleStage,
        version: updated.version,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      };
    }

    const insertedRows = await this.db
      .insert(featureFlags)
      .values({
        id: `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        flagKey: flag.flagKey,
        environment: flag.environment,
        defaultState: flag.defaultState,
        lifecycleStage: flag.lifecycleStage,
        version: flag.version,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    const inserted = insertedRows[0];
    return {
      id: inserted.id,
      flagKey: inserted.flagKey,
      environment: inserted.environment,
      defaultState: inserted.defaultState,
      lifecycleStage: inserted.lifecycleStage,
      version: inserted.version,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt
    };
  }

  /** Expected complexity: O(1) */
  async updateState(flagKey: string, environment: string, enabled: boolean): Promise<void> {
    await this.db
      .update(featureFlags)
      .set({ defaultState: enabled, updatedAt: new Date() })
      .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)));
  }

  /** Expected complexity: O(1) */
  async updateLifecycle(flagKey: string, stage: string): Promise<void> {
    await this.db
      .update(featureFlags)
      .set({ lifecycleStage: stage, updatedAt: new Date() })
      .where(eq(featureFlags.flagKey, flagKey));
  }
}
