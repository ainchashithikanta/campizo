import { randomUUID } from 'node:crypto';
import { logger, TraceContextStore } from '@college-hub/logger';
import type { AuditLogEntryInput, AuditLogRecordPayload, AuditSearchFilter } from './audit-types.js';
import { calculateAuditHash, verifyAuditChainIntegrity, anonymizeIp } from './crypto-integrity.js';

export class StructuredAuditLogger {
  private auditLogStore: AuditLogRecordPayload[] = [];
  private lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  private anonymizeIpAddresses: boolean;

  constructor(anonymizeIpAddresses = true) {
    this.anonymizeIpAddresses = anonymizeIpAddresses;
  }

  public async logAction(entry: AuditLogEntryInput): Promise<AuditLogRecordPayload> {
    const activeContext = TraceContextStore.getContext();
    const traceId = entry.traceId || activeContext?.traceId || randomUUID();

    const id = randomUUID();
    const createdAt = new Date();
    const ipAddress = this.anonymizeIpAddresses ? anonymizeIp(entry.ipAddress) : entry.ipAddress;
    const severity =
      entry.severity || (entry.action.includes('DENIED') || entry.action.includes('CRITICAL') ? 'SECURITY' : 'INFO');
    const actorType =
      entry.actorType || (entry.actorRole === 'SUPER_ADMIN' || entry.actorRole === 'COLLEGE_ADMIN' ? 'ADMIN' : 'USER');

    const previousHash = this.lastHash;

    const unhashedPayload: Omit<AuditLogRecordPayload, 'hash'> = {
      id,
      collegeId: entry.collegeId,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      actorType,
      severity,
      action: entry.action,
      targetEntityId: entry.targetEntityId,
      targetEntityType: entry.targetEntityType,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      reason: entry.reason,
      ipAddress,
      userAgent: entry.userAgent,
      traceId,
      previousHash,
      createdAt
    };

    const hash = calculateAuditHash(unhashedPayload, previousHash);
    const finalRecord: AuditLogRecordPayload = { ...unhashedPayload, hash };

    this.lastHash = hash;
    this.auditLogStore.push(finalRecord);

    logger.info(
      {
        auditId: id,
        collegeId: entry.collegeId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        severity,
        traceId,
        hash
      },
      `🛡️ Security Audit Event Logged: [${entry.action}]`
    );

    return finalRecord;
  }

  public searchLogs(filter: AuditSearchFilter = {}): AuditLogRecordPayload[] {
    return this.auditLogStore.filter((record) => {
      if (filter.collegeId && record.collegeId !== filter.collegeId) return false;
      if (filter.actorUserId && record.actorUserId !== filter.actorUserId) return false;
      if (filter.severity && record.severity !== filter.severity) return false;
      if (filter.action && record.action !== filter.action) return false;
      if (filter.startDate && record.createdAt < filter.startDate) return false;
      if (filter.endDate && record.createdAt > filter.endDate) return false;
      return true;
    });
  }

  public exportLogs(filter: AuditSearchFilter = {}, format: 'json' | 'csv' = 'json'): string {
    const logs = this.searchLogs(filter);
    if (format === 'csv') {
      const headers = 'id,collegeId,actorUserId,actorRole,action,severity,targetEntityId,createdAt,hash\n';
      const rows = logs
        .map(
          (l) =>
            `"${l.id}","${l.collegeId}","${l.actorUserId}","${l.actorRole}","${l.action}","${l.severity}","${l.targetEntityId}","${l.createdAt.toISOString()}","${l.hash}"`
        )
        .join('\n');
      return headers + rows;
    }
    return JSON.stringify(logs, null, 2);
  }

  public verifyIntegrity(): { valid: boolean; brokenIndex?: number } {
    return verifyAuditChainIntegrity(this.auditLogStore);
  }

  public clearAll(): void {
    this.auditLogStore = [];
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }
}
