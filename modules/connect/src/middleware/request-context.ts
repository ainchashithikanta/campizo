/**
 * Campus Connect — Shared RequestContext Middleware
 * Extracts and propagates request identity, tenant college ID, roles, tracing metadata, and idempotency key.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export interface RequestContext {
  requestId: string;
  traceId: string;
  collegeId: string;
  userId: string;
  roles: string[];
  idempotencyKey?: string | undefined;
  timestamp: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    context: RequestContext;
  }
}

export async function requestContextMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const requestId = (request.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const traceId = (request.headers['x-trace-id'] as string) || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const collegeId = (request.headers['x-college-id'] as string) || 'college_stanford_001';
  const userId = (request.headers['x-user-id'] as string) || 'usr_anonymous';
  const rolesHeader = (request.headers['x-roles'] as string) || 'STUDENT';
  const roles = rolesHeader.split(',').map((r) => r.trim());
  const idempotencyKey = (request.headers['idempotency-key'] as string) || undefined;

  request.context = {
    requestId,
    traceId,
    collegeId,
    userId,
    roles,
    idempotencyKey,
    timestamp: new Date().toISOString()
  };
}
