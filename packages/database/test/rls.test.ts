import { describe, it, expect, vi } from 'vitest';
import { enableRlsSql, createTenantPolicySql, setTenantContextSql, withTenantContext } from '../src/rls.js';

describe('PostgreSQL Row Level Security (RLS) Isolation Engine', () => {
  it('should generate valid ALTER TABLE ENABLE ROW LEVEL SECURITY SQL statement', () => {
    const sql = enableRlsSql('users');
    expect(sql).toBe('ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;');
  });

  it('should generate restrictive tenant isolation policy SQL statement with college_id filtering', () => {
    const sql = createTenantPolicySql('users');
    expect(sql).toContain('CREATE POLICY tenant_isolation_policy ON "users"');
    expect(sql).toContain('AS RESTRICTIVE');
    expect(sql).toContain("college_id::text = CURRENT_SETTING('app.current_college_id', true)");
  });

  it('should format SET LOCAL session variable statements for standard tenant access', () => {
    const sql = setTenantContextSql('college-stanford-001', false);
    expect(sql).toContain("SET LOCAL app.current_college_id = 'college-stanford-001';");
    expect(sql).toContain("SET LOCAL app.is_super_admin = 'false';");
  });

  it('should format SET LOCAL session variable statements for Super Admin bypass', () => {
    const sql = setTenantContextSql('college-stanford-001', true);
    expect(sql).toContain("SET LOCAL app.current_college_id = 'college-stanford-001';");
    expect(sql).toContain("SET LOCAL app.is_super_admin = 'true';");
  });

  it('should execute withTenantContext transaction wrapper with set session variable', async () => {
    const mockTx = {
      execute: vi.fn().mockResolvedValue(true)
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      })
    };

    const result = await withTenantContext(
      mockDb as any,
      { collegeId: 'stanford-123', isSuperAdmin: false },
      async (tx) => {
        expect(tx).toBe(mockTx);
        return 'success';
      }
    );

    expect(result).toBe('success');
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
  });
});
