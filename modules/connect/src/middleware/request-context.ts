/**
 * Campus Connect — Shared RequestContext Middleware
 * Extracts and propagates request identity, tenant college ID, roles, tracing metadata, and idempotency key.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { studentAuthService } from '../services/student-auth.service.js';

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

export async function requestContextMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const requestId =
    (request.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const traceId =
    (request.headers['x-trace-id'] as string) || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const idempotencyKey = (request.headers['idempotency-key'] as string) || undefined;
  const timestamp = new Date().toISOString();

  // Authenticated identity: a valid x-auth-token takes precedence over any
  // client-supplied identity headers (prevents spoofing user/college/gender).
  const authToken = request.headers['x-auth-token'] as string | undefined;
  if (authToken) {
    const identity = studentAuthService.verifyToken(authToken);
    if (identity) {
      const account = studentAuthService.getAccountById(identity.userId);
      request.connectContext = {
        requestId,
        traceId,
        collegeId: identity.collegeId,
        userId: identity.userId,
        roles: ['STUDENT'],
        gender: account?.gender,
        authenticated: true,
        idempotencyKey,
        timestamp
      };
      return;
    }
  }

  // Guest / legacy identity from headers
  const collegeId = (request.headers['x-college-id'] as string) || 'college_stanford_001';
  const userId = (request.headers['x-user-id'] as string) || 'usr_anonymous';
  const rolesHeader = (request.headers['x-roles'] as string) || 'STUDENT';
  const roles = rolesHeader.split(',').map((r) => r.trim());
  const gender = (request.headers['x-user-gender'] as string) || undefined;

  request.connectContext = {
    requestId,
    traceId,
    collegeId,
    userId,
    roles,
    gender,
    authenticated: false,
    idempotencyKey,
    timestamp
  };
}
