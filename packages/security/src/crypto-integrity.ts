import { createHash } from 'node:crypto';
import type { AuditLogRecordPayload } from './audit-types.js';

export function calculateAuditHash(payload: Omit<AuditLogRecordPayload, 'hash'>, previousHash: string): string {
  const content = JSON.stringify({
    id: payload.id,
    collegeId: payload.collegeId,
    actorUserId: payload.actorUserId,
    actorRole: payload.actorRole,
    action: payload.action,
    targetEntityId: payload.targetEntityId,
    targetEntityType: payload.targetEntityType,
    oldValue: payload.oldValue || null,
    newValue: payload.newValue || null,
    reason: payload.reason || null,
    createdAt: payload.createdAt.toISOString(),
    previousHash
  });

  return createHash('sha256').update(content).digest('hex');
}

export function verifyAuditChainIntegrity(records: AuditLogRecordPayload[]): { valid: boolean; brokenIndex?: number } {
  let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    if (record.previousHash !== expectedPrevHash) {
      return { valid: false, brokenIndex: i };
    }

    const computedHash = calculateAuditHash(record, expectedPrevHash);
    if (record.hash !== computedHash) {
      return { valid: false, brokenIndex: i };
    }

    expectedPrevHash = record.hash;
  }

  return { valid: true };
}

export function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return '0.0.0.0';
  if (ip.includes('.')) {
    // IPv4: mask last octet e.g. 192.168.1.50 -> 192.168.1.0
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }
  if (ip.includes(':')) {
    // IPv6: mask host segment
    const parts = ip.split(':');
    if (parts.length > 4) {
      return `${parts.slice(0, 4).join(':')}:0000:0000:0000:0000`;
    }
  }
  return ip;
}
