import { describe, it, expect, beforeEach } from 'vitest';
import { StructuredAuditLogger, anonymizeIp } from '../src/index.js';

describe('Administrative Audit Logging & Security Event System', () => {
  let auditLogger: StructuredAuditLogger;

  beforeEach(() => {
    auditLogger = new StructuredAuditLogger(true);
  });

  it('should log audit actions with tenant ID, trace ID, and anonymized IP address', async () => {
    const record = await auditLogger.logAction({
      collegeId: 'college-stanford-001',
      actorUserId: 'user-admin-101',
      actorRole: 'COLLEGE_ADMIN',
      action: 'COLLEGE_THEME_UPDATED',
      targetEntityId: 'theme-stanford',
      targetEntityType: 'THEME',
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      reason: 'Updating Stanford primary branding color to official crimson'
    });

    expect(record.collegeId).toBe('college-stanford-001');
    expect(record.actorUserId).toBe('user-admin-101');
    expect(record.ipAddress).toBe('192.168.1.0'); // Privacy-anonymized IP
    expect(record.hash).toBeDefined();
    expect(record.previousHash).toBeDefined();
  });

  it('should mask IPv4 and IPv6 addresses for user privacy', () => {
    expect(anonymizeIp('192.168.1.50')).toBe('192.168.1.0');
    expect(anonymizeIp('10.0.0.123')).toBe('10.0.0.0');
    expect(anonymizeIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3:8d3:0000:0000:0000:0000');
  });

  it('should build a valid cryptographic SHA-256 hash chain across sequential events', async () => {
    await auditLogger.logAction({
      collegeId: 'stanford-1',
      actorUserId: 'usr-1',
      actorRole: 'STUDENT',
      action: 'LOGIN_SUCCESS',
      targetEntityId: 'session-1',
      targetEntityType: 'SESSION',
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent'
    });

    await auditLogger.logAction({
      collegeId: 'stanford-1',
      actorUserId: 'usr-2',
      actorRole: 'COLLEGE_ADMIN',
      action: 'MODULE_DISABLED',
      targetEntityId: 'marketplace',
      targetEntityType: 'MODULE',
      reason: 'Temporarily disabled for exam week',
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent'
    });

    const integrity = auditLogger.verifyIntegrity();
    expect(integrity.valid).toBe(true);
  });

  it('should detect tampering if an audit log payload or hash is modified', async () => {
    await auditLogger.logAction({
      collegeId: 'stanford-1',
      actorUserId: 'usr-1',
      actorRole: 'STUDENT',
      action: 'FILE_UPLOAD',
      targetEntityId: 'file-123',
      targetEntityType: 'FILE',
      ipAddress: '10.0.0.1',
      userAgent: 'TestAgent'
    });

    const logs = auditLogger.searchLogs();
    expect(logs.length).toBe(1);

    // Tamper with record in memory
    if (logs[0]) {
      logs[0].action = 'TAMPERED_ACTION';
    }

    const integrity = auditLogger.verifyIntegrity();
    expect(integrity.valid).toBe(false);
  });

  it('should filter logs by collegeId, severity, and export in JSON & CSV formats', async () => {
    await auditLogger.logAction({
      collegeId: 'mit-1',
      actorUserId: 'admin-1',
      actorRole: 'SUPER_ADMIN',
      severity: 'CRITICAL',
      action: 'DATABASE_RESTORE',
      targetEntityId: 'backup-001',
      targetEntityType: 'BACKUP',
      ipAddress: '10.0.0.1',
      userAgent: 'TestAgent'
    });

    const filtered = auditLogger.searchLogs({ collegeId: 'mit-1', severity: 'CRITICAL' });
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.action).toBe('DATABASE_RESTORE');

    const jsonExport = auditLogger.exportLogs({ collegeId: 'mit-1' }, 'json');
    expect(jsonExport).toContain('DATABASE_RESTORE');

    const csvExport = auditLogger.exportLogs({ collegeId: 'mit-1' }, 'csv');
    expect(csvExport).toContain('DATABASE_RESTORE');
    expect(csvExport.startsWith('id,collegeId')).toBe(true);
  });
});
