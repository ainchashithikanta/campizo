/**
 * Campus Connect — RBAC Middleware
 * Role-Based Access Control enforcing permitted roles per endpoint.
 * Supported roles: SUPER_ADMIN, PLATFORM_ADMIN, COLLEGE_ADMIN, MODERATOR, STUDENT, READ_ONLY.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenApplicationError } from '../errors/application-errors.js';

export function rbacMiddleware(allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const userRoles = request.context?.roles || ['STUDENT'];

    // SUPER_ADMIN & PLATFORM_ADMIN bypass specific role restrictions
    if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('PLATFORM_ADMIN')) {
      return;
    }

    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasPermission) {
      throw new ForbiddenApplicationError(`Action requires one of the following roles: ${allowedRoles.join(', ')}`);
    }
  };
}
