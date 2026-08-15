/**
 * Campus Connect — Shared RequestContext Middleware
 * Extracts and propagates request identity, tenant college ID, roles, tracing metadata, and idempotency key.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { studentAuthService } from '../services/student-auth.service.js';
import { verifyJwt } from '@college-hub/security';

export interface RequestContext {
  requestId: string;
  traceId: string;
  collegeId: string;
  userId: string;
  roles: string[];
  gender?: string | undefined;
  authenticated: boolean;
  idempotencyKey?: string | undefined;
  timestamp: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    connectContext: RequestContext;
  }
}

function resolveStudentIdentity(authToken: string | undefined): { sub: string; collegeId: string } | null {
  if (!authToken) return null;
  // Standard admin JWT (used by the admin bridge): Authorization: Bearer <jwt>
  if (authToken.startsWith('Bearer ')) {
    try {
      const claims = verifyJwt(authToken.slice('Bearer '.length));
      if (!claims) return null;
      return { sub: claims.sub, collegeId: claims.collegeId };
    } catch {
      return null;
    }
  }
  // Legacy connect student token: v1.<payload>.<sig>
  const legacy = studentAuthService.verifyToken(authToken);
  if (!legacy) return null;
  return { sub: legacy.userId, collegeId: legacy.collegeId };
}

export async function requestContextMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const requestId =
    (request.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const traceId =
    (request.headers['x-trace-id'] as string) || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const idempotencyKey = (request.headers['idempotency-key'] as string) || undefined;
  const timestamp = new Date().toISOString();

  const tenantCollegeId = (request.headers['x-college-id'] as string) || 'college-stanford-001';

  // Authenticated identity: a valid token takes precedence over any
  // client-supplied identity headers (prevents spoofing user/college/gender).
  // Supports both standard admin JWTs (Authorization: Bearer) and legacy
  // connect student tokens (x-auth-token: v1.<payload>.<sig>).
  const authToken =
    (request.headers['authorization'] as string | undefined)?.trim() ||
    (request.headers['x-auth-token'] as string | undefined)?.trim();
  if (authToken) {
    const identity = resolveStudentIdentity(authToken);
    if (identity) {
      const account = studentAuthService.getAccountById(identity.sub);
      // Resolve collegeId: admin wildcard ('*') falls back to the x-college-id header.
      const collegeId = identity.collegeId === '*' ? tenantCollegeId : identity.collegeId || tenantCollegeId;
      // Extract roles from JWT claims; default to STUDENT for legacy student tokens.
      // Roles are NEVER derived from client-supplied headers.
      let roles: string[];
      if (authToken.startsWith('Bearer ')) {
        const claims = verifyJwt(authToken.slice('Bearer '.length));
        roles = claims?.roles ?? ['STUDENT'];
      } else {
        roles = ['STUDENT'];
      }
      request.connectContext = {
        requestId,
        traceId,
        collegeId,
        userId: identity.sub,
        roles,
        gender: account?.gender ?? undefined,
        authenticated: true,
        idempotencyKey,
        timestamp
      };
      return;
    }
  }

  // Guest / legacy identity from headers. Roles are NEVER derived from the
  // client-supplied x-roles header — a caller must not be able to grant
  // itself SUPER_ADMIN. Role claims come only from verified tokens.
  request.connectContext = {
    requestId,
    traceId,
    collegeId: tenantCollegeId,
    userId: (request.headers['x-user-id'] as string) || 'usr_anonymous',
    roles: ['GUEST'],
    gender: (request.headers['x-user-gender'] as string) || undefined,
    authenticated: false,
    idempotencyKey,
    timestamp
  };
}
