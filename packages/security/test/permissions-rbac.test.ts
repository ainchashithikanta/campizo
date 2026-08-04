import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionEvaluator, RoleEngine, PermissionRegistry, PermissionCache } from '../src/index.js';

describe('Core RBAC & Fine-Grained Permission Engine', () => {
  let evaluator: PermissionEvaluator;
  let roleEngine: RoleEngine;

  beforeEach(() => {
    roleEngine = new RoleEngine();
    evaluator = new PermissionEvaluator(roleEngine);
  });

  it('should enforce Default Deny policy for non-assigned permissions', () => {
    const allowed = evaluator.canUser({
      userId: 'usr-student-1',
      userRoles: ['STUDENT'],
      collegeId: 'stanford-1',
      permission: 'college.settings.update.college' // Admin permission
    });

    expect(allowed).toBe(false);
  });

  it('should grant Super Admin bypass for any permission', () => {
    const allowed = evaluator.canUser({
      userId: 'usr-super-1',
      userRoles: ['SUPER_ADMIN'],
      collegeId: 'stanford-1',
      permission: 'college.settings.update.college'
    });

    expect(allowed).toBe(true);
  });

  it('should resolve permission inheritance chains across roles', () => {
    // MODERATOR role inherits STUDENT permissions + has MODERATOR permissions
    const isStudentPerm = evaluator.canUser({
      userId: 'usr-mod-1',
      userRoles: ['MODERATOR'],
      collegeId: 'stanford-1',
      permission: 'confession.post.create.own' // Inherited from STUDENT
    });

    const isModPerm = evaluator.canUser({
      userId: 'usr-mod-1',
      userRoles: ['MODERATOR'],
      collegeId: 'stanford-1',
      permission: 'confession.post.moderate.college' // Specific to MODERATOR
    });

    expect(isStudentPerm).toBe(true);
    expect(isModPerm).toBe(true);
  });

  it('should enforce explicit DENY overrides over ALLOW overrides', () => {
    const res = evaluator.simulatePermissionCheck({
      userId: 'usr-student-1',
      userRoles: ['STUDENT'],
      collegeId: 'stanford-1',
      permission: 'confession.post.create.own',
      userOverrides: [
        { permission: 'confession.post.create.own', effect: 'ALLOW', reason: 'VIP User' },
        { permission: 'confession.post.create.own', effect: 'DENY', reason: 'Banned from Confessions' }
      ]
    });

    expect(res.allowed).toBe(false);
    expect(res.matchedRule).toBe('EXPLICIT_DENY_OVERRIDE');
    expect(res.reason).toContain('Banned from Confessions');
  });

  it('should ignore expired temporary permission overrides', () => {
    const expiredDate = new Date(Date.now() - 10000); // 10s ago

    const res = evaluator.simulatePermissionCheck({
      userId: 'usr-student-1',
      userRoles: ['STUDENT'],
      collegeId: 'stanford-1',
      permission: 'college.settings.update.college',
      userOverrides: [
        {
          permission: 'college.settings.update.college',
          effect: 'ALLOW',
          expiresAt: expiredDate,
          reason: 'Temporary Admin'
        }
      ]
    });

    expect(res.allowed).toBe(false); // Expired, falls back to Default Deny
    expect(res.matchedRule).toBe('DEFAULT_DENY');
  });

  it('should block all non-SuperAdmin access during Emergency Lockdown', () => {
    evaluator.enableLockdown();

    const studentAllowed = evaluator.canUser({
      userId: 'usr-student-1',
      userRoles: ['STUDENT'],
      collegeId: 'stanford-1',
      permission: 'confession.post.create.own'
    });

    const superAdminAllowed = evaluator.canUser({
      userId: 'usr-super-1',
      userRoles: ['SUPER_ADMIN'],
      collegeId: 'stanford-1',
      permission: 'confession.post.create.own'
    });

    expect(studentAllowed).toBe(false);
    expect(superAdminAllowed).toBe(true);
  });

  it('should register custom college roles and evaluate custom permissions', () => {
    roleEngine.registerCustomRole('mit-1', {
      name: 'DEAN_DELEGATE',
      description: 'MIT Dean Special Delegate',
      permissions: new Set(['college.settings.update.college'])
    });

    const allowed = evaluator.canUser({
      userId: 'usr-delegate-1',
      userRoles: ['DEAN_DELEGATE'],
      collegeId: 'mit-1',
      permission: 'college.settings.update.college'
    });

    expect(allowed).toBe(true);
  });

  it('should validate permission naming format module.resource.action.scope', () => {
    expect(PermissionRegistry.isValidFormat('professor.review.create.own')).toBe(true);
    expect(PermissionRegistry.isValidFormat('invalid_permission')).toBe(false);
  });
});
