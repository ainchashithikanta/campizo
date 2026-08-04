export class PermissionRegistry {
  private static registeredPermissions = new Set<string>([
    'professor.review.create.own',
    'professor.review.update.own',
    'professor.review.delete.own',
    'professor.review.report.own',
    'professor.review.vote.own',
    'professor.response.create.own',
    'professor.response.update.own',
    'professor.review.moderate.college',
    'professor.review.read.college',
    'marketplace.listing.create.own',
    'marketplace.listing.approve.college',
    'marketplace.listing.delete.own',
    'materials.upload.own',
    'materials.approve.college',
    'confession.post.create.own',
    'confession.post.moderate.college',
    'user.profile.update.own',
    'college.settings.update.college',
    'system.admin.super'
  ]);

  public static register(permission: string): void {
    if (!this.isValidFormat(permission)) {
      throw new Error(`Invalid permission format '${permission}'. Must follow 'module.resource.action.scope' pattern.`);
    }
    this.registeredPermissions.add(permission);
  }

  public static isValidFormat(permission: string): boolean {
    const parts = permission.split('.');
    return parts.length === 4;
  }

  public static isRegistered(permission: string): boolean {
    return this.registeredPermissions.has(permission);
  }

  public static getAll(): string[] {
    return Array.from(this.registeredPermissions);
  }
}
