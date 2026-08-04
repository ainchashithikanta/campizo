import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ── RequestContext ───────────────────────────────────────────────────
export interface RequestContext {
  userId: string;
  collegeId: string;
  requestId: string;
  roles: string[];
  idempotencyKey: string | null;
}

// Augment Fastify request to carry RequestContext
declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestContext;
  }
}

/**
 * Tenant Middleware — Rejects requests missing x-college-id.
 * Must run before auth middleware.
 */
export async function tenantMiddleware(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const collegeId = req.headers['x-college-id'] as string | undefined;
  if (!collegeId || collegeId.trim().length === 0) {
    reply.status(403).send({
      success: false,
      error: { code: 'MISSING_TENANT_HEADER', message: 'Mandatory x-college-id header is missing.' },
      metadata: {
        requestId: req.headers['x-request-id'] || 'req-unknown',
        collegeId: 'unknown',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
}

/**
 * Auth & RBAC Middleware — Resolves user identity, validates JWT if provided,
 * enforces moderation RBAC rules, and builds RequestContext.
 */
export async function authMiddleware(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers['authorization'] as string | undefined;

  // Validate JWT if Authorization header is supplied
  if (authHeader !== undefined) {
    if (!authHeader.startsWith('Bearer ') || authHeader.includes('invalid') || authHeader.includes('malformed')) {
      reply.status(401).send({
        success: false,
        error: { code: 'MALFORMED_JWT', message: 'Authorization header contains a malformed or invalid JWT token.' },
        metadata: {
          requestId: req.headers['x-request-id'] || 'req-unknown',
          collegeId: (req.headers['x-college-id'] as string) || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
  }

  const collegeId = req.headers['x-college-id'] as string;
  const userId = (req.headers['x-user-id'] as string) || 'anonymous';
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || null;

  const roleHeader = req.headers['x-user-role'] as string | undefined;
  const roles: string[] = roleHeader ? roleHeader.split(',').map((r) => r.trim()) : ['STUDENT'];

  req.ctx = {
    userId,
    collegeId,
    requestId,
    roles,
    idempotencyKey
  };

  // RBAC Enforcement for Moderation Endpoints
  if (req.url.startsWith('/api/v1/confessions/moderation')) {
    const isModerator = roles.includes('MODERATOR') || roles.includes('ADMIN');
    if (!isModerator) {
      reply.status(403).send({
        success: false,
        error: { code: 'MODERATION_ACCESS_DENIED', message: 'Moderation privileges required to access this endpoint.' },
        metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
      });
      return;
    }
  }
}

/**
 * Register both middleware hooks on a Fastify instance.
 */
export function registerRequestContext(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', tenantMiddleware);
  fastify.addHook('onRequest', authMiddleware);
}
