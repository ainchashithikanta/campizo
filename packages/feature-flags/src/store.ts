import { logger } from '@college-hub/logger';
import { FeatureFlagRuleSchema, type FeatureFlagRule, type FeatureFlagAuditRecord } from './types.js';

export class FeatureFlagStore {
  private flags = new Map<string, FeatureFlagRule>();
  private history: FeatureFlagAuditRecord[] = [];

  public setFlag(rule: FeatureFlagRule, updatedBy = 'system'): void {
    const validatedRule = FeatureFlagRuleSchema.parse(rule);
    const existing = this.flags.get(validatedRule.key);

    const nextVersion = existing ? existing.version + 1 : 1;
    const finalRule: FeatureFlagRule = { ...validatedRule, version: nextVersion };

    this.flags.set(finalRule.key, finalRule);

    const auditRecord: FeatureFlagAuditRecord = {
      flagKey: finalRule.key,
      version: nextVersion,
      action: existing ? 'UPDATED' : 'CREATED',
      ...(existing ? { oldRule: existing } : {}),
      newRule: finalRule,
      updatedBy,
      timestamp: new Date()
    };

    this.history.push(auditRecord);
    logger.info({ flagKey: finalRule.key, version: nextVersion, action: auditRecord.action }, 'Feature flag updated');
  }

  public getFlag(key: string): FeatureFlagRule | null {
    return this.flags.get(key) || null;
  }

  public getAllFlags(): FeatureFlagRule[] {
    return Array.from(this.flags.values());
  }

  public getAuditHistory(flagKey?: string): FeatureFlagAuditRecord[] {
    if (flagKey) {
      return this.history.filter((h) => h.flagKey === flagKey);
    }
    return [...this.history];
  }

  public rollbackFlag(key: string, targetVersion: number, updatedBy = 'system'): boolean {
    const records = this.getAuditHistory(key).filter((h) => h.version === targetVersion);
    if (records.length === 0) return false;

    const targetRecord = records[records.length - 1]!;
    this.setFlag(targetRecord.newRule, `rollback-by:${updatedBy}`);
    return true;
  }
}
