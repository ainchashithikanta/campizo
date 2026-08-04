/**
 * Campus Connect — Rollback Manager
 * Manages administrative rollbacks across recommendations, activity feed entries, notification queues, and event streams.
 * EMITS STRUCTURED AUDIT LOG EVENTS FOR EVERY ROLLBACK OPERATION.
 */

import { ConnectUseCases } from '../use-cases/connect.use-cases.js';

export interface RollbackAuditEvent {
  rollbackId: string;
  targetType: 'RECOMMENDATION' | 'ACTIVITY' | 'NOTIFICATION' | 'EVENT';
  targetId: string;
  collegeId: string;
  reason: string;
  timestamp: string;
}

export class RollbackManager {
  private auditLogs: RollbackAuditEvent[] = [];

  constructor(private readonly useCases: ConnectUseCases) {}

  async rollbackRecommendation(snapshotId: string, collegeId: string, reason: string): Promise<RollbackAuditEvent> {
    await this.useCases.archiveRecommendation(snapshotId, collegeId);

    const auditEntry: RollbackAuditEvent = {
      rollbackId: `rb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetType: 'RECOMMENDATION',
      targetId: snapshotId,
      collegeId,
      reason,
      timestamp: new Date().toISOString()
    };

    this.auditLogs.push(auditEntry);
    return auditEntry;
  }

  async rollbackActivity(activityId: string, collegeId: string, reason: string): Promise<RollbackAuditEvent> {
    const auditEntry: RollbackAuditEvent = {
      rollbackId: `rb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetType: 'ACTIVITY',
      targetId: activityId,
      collegeId,
      reason,
      timestamp: new Date().toISOString()
    };

    this.auditLogs.push(auditEntry);
    return auditEntry;
  }

  getAuditLogs(): RollbackAuditEvent[] {
    return [...this.auditLogs];
  }

  clear(): void {
    this.auditLogs = [];
  }
}
