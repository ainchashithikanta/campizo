import type { RoleDefinition } from './permission-types.js';

export class RoleEngine {
  private roles = new Map<string, RoleDefinition>();

  constructor() {
    this.initializeDefaultSystemRoles();
  }

  private initializeDefaultSystemRoles(): void {
    // 1. Student Role
    this.roles.set('STUDENT', {
      name: 'STUDENT',
      description: 'Standard Student Role',
      permissions: new Set([
        'professor.review.create.own',
        'professor.review.read.college',
        'marketplace.listing.create.own',
        'marketplace.listing.delete.own',
        'materials.upload.own',
        'confession.post.create.own',
        'user.profile.update.own'
      ])
    });

    // 2. Moderator Role (Inherits STUDENT + Adds Moderation Permissions)
    this.roles.set('MODERATOR', {
      name: 'MODERATOR',
      description: 'College Student Moderator',
      parentRole: 'STUDENT',
      permissions: new Set([
        'confession.post.moderate.college',
        'marketplace.listing.approve.college',
        'materials.approve.college'
      ])
    });

    // 3. College Admin Role (Inherits MODERATOR + Adds Admin Permissions)
    this.roles.set('COLLEGE_ADMIN', {
      name: 'COLLEGE_ADMIN',
      description: 'College Administrative Officer',
      parentRole: 'MODERATOR',
      permissions: new Set(['professor.review.delete.college', 'college.settings.update.college'])
    });

    // 4. Super Admin Role
    this.roles.set('SUPER_ADMIN', {
      name: 'SUPER_ADMIN',
      description: 'Platform Super Administrator',
      permissions: new Set(['system.admin.super'])
    });
  }

  public registerCustomRole(collegeId: string, roleDef: Omit<RoleDefinition, 'isCustom' | 'collegeId'>): void {
    const key = `${collegeId}:${roleDef.name}`;
    this.roles.set(key, {
      ...roleDef,
      isCustom: true,
      collegeId
    });
  }

  public getRolePermissions(roleName: string, collegeId?: string): Set<string> {
    const resolvedPermissions = new Set<string>();

    const fetchPermissionsRecursive = (currentRole: string) => {
      const customKey = collegeId ? `${collegeId}:${currentRole}` : currentRole;
      const roleDef = this.roles.get(customKey) || this.roles.get(currentRole);

      if (!roleDef) return;

      for (const p of roleDef.permissions) {
        resolvedPermissions.add(p);
      }

      if (roleDef.parentRole) {
        fetchPermissionsRecursive(roleDef.parentRole);
      }
    };

    fetchPermissionsRecursive(roleName);
    return resolvedPermissions;
  }
}
