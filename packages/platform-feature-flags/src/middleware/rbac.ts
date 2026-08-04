/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission authorization before controllers execute.
 */

import { RequestContext } from './request-context.js';
import { ForbiddenApplicationError } from '../errors/application-errors.js';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'ENGINEERING_LEAD'
  | 'OPERATIONS'
  | 'SUPPORT'
  | 'READONLY_ADMIN';

export function authorizeRole(ctx: RequestContext, allowedRoles: UserRole[]): void {
  // Super Admin overrides all role requirements
  if (ctx.roles.includes('SUPER_ADMIN')) {
    return;
  }

  const hasAccess = ctx.roles.some((role) => allowedRoles.includes(role as UserRole));
  if (!hasAccess) {
    throw new ForbiddenApplicationError(
      `User '${ctx.userId}' with roles [${ctx.roles.join(', ')}] is not authorized. Required: [${allowedRoles.join(', ')}]`
    );
  }
}
