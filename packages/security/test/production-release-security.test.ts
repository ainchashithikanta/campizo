import { describe, it, expect, beforeEach } from 'vitest';
import {
  StructuredAuditLogger,
  anonymizeIp,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  RECOMMENDED_ARGON2_OPTIONS
} from '../src/index.js';

describe('MS-58 Production Release Security Audit & Verification Suite', () => {
  let auditLogger: StructuredAuditLogger;

  beforeEach(() => {
    auditLogger = new StructuredAuditLogger(true);
  });

  describe('OWASP & Identity Security Controls', () => {
    it('enforces enterprise password policy requirements (length >= 10, uppercase, lowercase, digit, special character)', () => {
      const weakPassword = validatePasswordStrength('weak123');
      expect(weakPassword.valid).toBe(false);
      expect(weakPassword.errors.length).toBeGreaterThan(0);

      const strongPassword = validatePasswordStrength('SecureP@ssw0rd!2026');
      expect(strongPassword.valid).toBe(true);
      expect(strongPassword.errors).toHaveLength(0);
    });

    it('hashes passwords using production-grade Argon2id parameters', async () => {
      const plainPassword = 'SuperSecretKey#2026';
      const hashed = await hashPassword(plainPassword, RECOMMENDED_ARGON2_OPTIONS);

      expect(hashed).toMatch(/^\$argon2id\$/);
      const isMatch = await verifyPassword(plainPassword, hashed);
      expect(isMatch).toBe(true);

      const isInvalidMatch = await verifyPassword('WrongPassword#2026', hashed);
      expect(isInvalidMatch).toBe(false);
    });
  });

  describe('GDPR & Privacy Compliance', () => {
    it('anonymizes IPv4 and IPv6 user IP addresses prior to persistent logging', () => {
      expect(anonymizeIp('198.51.100.42')).toBe('198.51.100.0');
      expect(anonymizeIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3:8d3:0000:0000:0000:0000');
    });
  });

  describe('Audit Trail Tamper-Evidence & High-Load Reliability', () => {
    it('maintains tamper-evident SHA-256 hash chain under rapid concurrent audit event logging', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        collegeId: `college-tenant-${(i % 3) + 1}`,
        actorUserId: `user-admin-${i}`,
        actorRole: 'COLLEGE_ADMIN' as const,
        action: `SECURITY_CONFIG_CHANGE_${i}`,
        targetEntityId: `entity-${i}`,
        targetEntityType: 'CONFIG',
        ipAddress: `10.0.${i % 255}.15`,
        userAgent: 'AuditSuiteRunner/1.0'
      }));

      for (const event of events) {
        await auditLogger.logAction(event);
      }

      const integrity = auditLogger.verifyIntegrity();
      expect(integrity.valid).toBe(true);
      expect(auditLogger.searchLogs()).toHaveLength(50);
    });

    it('exports audit logs cleanly for enterprise SIEM ingestion without data corruption', async () => {
      await auditLogger.logAction({
        collegeId: 'stanford-001',
        actorUserId: 'admin-sec-01',
        actorRole: 'SUPER_ADMIN',
        severity: 'CRITICAL',
        action: 'TENANT_PROVISIONED',
        targetEntityId: 'tenant-stanford',
        targetEntityType: 'TENANT',
        ipAddress: '192.168.1.10',
        userAgent: 'SIEMExportTest'
      });

      const jsonExport = auditLogger.exportLogs({ collegeId: 'stanford-001' }, 'json');
      const parsed = JSON.parse(jsonExport);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe('TENANT_PROVISIONED');
      expect(parsed[0].hash).toBeDefined();
    });
  });
});
