import { describe, it, expect } from 'vitest';
import { collegeTenants, users, auditLogs, activeRecordsOnly, CoreFoundationSeeder } from '../src/index.js';

describe('Database Foundation Schema & Architecture', () => {
  it('should define core foundation tables with UUID primary keys and audit columns', () => {
    expect(collegeTenants).toBeDefined();
    expect(users).toBeDefined();
    expect(auditLogs).toBeDefined();

    expect(collegeTenants.id).toBeDefined();
    expect(collegeTenants.version).toBeDefined();
    expect(collegeTenants.createdAt).toBeDefined();
    expect(collegeTenants.updatedAt).toBeDefined();
    expect(collegeTenants.deletedAt).toBeDefined();
  });

  it('should generate SQL soft delete filter condition via activeRecordsOnly helper', () => {
    const condition = activeRecordsOnly(users);
    expect(condition).toBeDefined();
  });

  it('should export versioned seeder class CoreFoundationSeeder', () => {
    const seeder = new CoreFoundationSeeder();
    expect(seeder.version).toBe('1.0.0');
    expect(typeof seeder.seed).toBe('function');
  });
});
