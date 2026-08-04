import { logger } from '@college-hub/logger';
import {
  FullCollegeConfigSchema,
  type FullCollegeConfig,
  type CollegeConfigAuditRecord
} from './college-config.schema.js';

export class CollegeConfigService {
  private configStore = new Map<string, FullCollegeConfig>();
  private cache = new Map<string, { config: FullCollegeConfig; expiresAt: number }>();
  private auditHistory: CollegeConfigAuditRecord[] = [];
  private cacheTtlMs: number;

  constructor(cacheTtlMs = 60_000) {
    this.cacheTtlMs = cacheTtlMs;
  }

  public onboardCollege(
    rawConfig: Partial<FullCollegeConfig> & {
      collegeId: string;
      name: string;
      slug: string;
      allowedEmailDomains: string[];
    },
    updatedBy = 'system'
  ): FullCollegeConfig {
    const validated = FullCollegeConfigSchema.parse({
      ...rawConfig,
      version: 1
    });

    this.configStore.set(validated.collegeId, validated);
    this.invalidateCache(validated.collegeId);

    const audit: CollegeConfigAuditRecord = {
      collegeId: validated.collegeId,
      version: 1,
      action: 'ONBOARDED',
      newConfig: validated,
      updatedBy,
      timestamp: new Date()
    };
    this.auditHistory.push(audit);

    logger.info({ collegeId: validated.collegeId, slug: validated.slug }, 'College onboarded with zero code changes');
    return validated;
  }

  public getCollegeConfig(collegeId: string): FullCollegeConfig {
    // 1. Check Cache
    const cached = this.cache.get(collegeId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.config;
    }

    // 2. Fetch Store
    const stored = this.configStore.get(collegeId);
    if (stored) {
      this.cache.set(collegeId, { config: stored, expiresAt: Date.now() + this.cacheTtlMs });
      return stored;
    }

    // 3. Safe Fallback Default Config if not onboarded
    const fallback: FullCollegeConfig = FullCollegeConfigSchema.parse({
      collegeId,
      name: `College (${collegeId})`,
      slug: collegeId.toLowerCase(),
      allowedEmailDomains: ['@edu']
    });

    return fallback;
  }

  public updateCollegeConfig(
    collegeId: string,
    partialUpdates: Record<string, unknown>,
    updatedBy = 'system'
  ): FullCollegeConfig {
    const current = this.getCollegeConfig(collegeId);
    const nextVersion = current.version + 1;

    const merged = FullCollegeConfigSchema.parse({
      ...current,
      ...partialUpdates,
      version: nextVersion
    });

    this.configStore.set(collegeId, merged);
    this.invalidateCache(collegeId);

    const audit: CollegeConfigAuditRecord = {
      collegeId,
      version: nextVersion,
      action: 'UPDATED',
      oldConfig: current,
      newConfig: merged,
      updatedBy,
      timestamp: new Date()
    };
    this.auditHistory.push(audit);

    logger.info({ collegeId, version: nextVersion }, 'College configuration updated dynamically');
    return merged;
  }

  public rollbackCollegeConfig(collegeId: string, targetVersion: number, updatedBy = 'system'): boolean {
    const matches = this.auditHistory.filter((h) => h.collegeId === collegeId && h.version === targetVersion);
    if (matches.length === 0) return false;

    const targetRecord = matches[matches.length - 1]!;
    this.updateCollegeConfig(collegeId, targetRecord.newConfig, `rollback-by:${updatedBy}`);
    return true;
  }

  public getAuditHistory(collegeId: string): CollegeConfigAuditRecord[] {
    return this.auditHistory.filter((h) => h.collegeId === collegeId);
  }

  public invalidateCache(collegeId: string): void {
    this.cache.delete(collegeId);
  }

  public clearAll(): void {
    this.configStore.clear();
    this.cache.clear();
    this.auditHistory = [];
  }
}
