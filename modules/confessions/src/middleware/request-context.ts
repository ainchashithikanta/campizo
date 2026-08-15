import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { resolveApiIdentity, isModerator } from '@college-hub/security';

// ── RequestContext ───────────────────────────────────────────────────
export interface RequestContext {
  userId: string;
  collegeId: string;
  requestId: string;
  roles: string[];
  isAuthenticated: boolean;
  idempotencyKey: string | null;
}

// Augment Fastify request to carry RequestContext
declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestContext;
  }
}

/**
 * Tenant Middleware — Resolves the collegeId from the verified identity
 * first, falling back to the x-college-id header for guest requests.
 * Rejects requests where no tenant can be established.
 */
export async function tenantMiddleware(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const headerCollegeId = req.headers['x-college-id'] as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;
  const resolution = resolveApiIdentity({
    authorizationHeader: authHeader,
    collegeIdHeader: headerCollegeId,
    userIdHeader: req.headers['x-user-id'] as string | undefined
  });

  const collegeId =
    resolution.status === 'ok' && resolution.identity.isAuthenticated
      ? // Admin-console tokens scope collegeId to '*' (cross-tenant). Honor the
        // explicit x-college-id header in that case so admin actions target the
        // intended tenant instead of an empty wildcard queue.
        resolution.identity.collegeId === '*'
        ? headerCollegeId
        : resolution.identity.collegeId || headerCollegeId
      : headerCollegeId;

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
 * Auth & RBAC Middleware — Verifies JWTs cryptographically, derives
 * identity/roles exclusively from verified token claims, and enforces
 * moderation RBAC. Client-supplied x-user-id / x-user-role headers are
 * never trusted for roles.
 */
export async function authMiddleware(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers['authorization'] as string | undefined;
  const headerCollegeId = req.headers['x-college-id'] as string | undefined;

  const resolution = resolveApiIdentity({
    authorizationHeader: authHeader,
    collegeIdHeader: headerCollegeId,
    userIdHeader: req.headers['x-user-id'] as string | undefined
  });

  if (resolution.status === 'config_error') {
    reply.status(500).send({
      success: false,
      error: { code: 'AUTH_CONFIG_ERROR', message: 'Server authentication configuration is incomplete.' },
      metadata: {
        requestId: req.headers['x-request-id'] || 'req-unknown',
        collegeId: headerCollegeId || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (resolution.status === 'invalid_token') {
    reply.status(401).send({
      success: false,
      error: { code: 'INVALID_JWT', message: resolution.message },
      metadata: {
        requestId: req.headers['x-request-id'] || 'req-unknown',
        collegeId: headerCollegeId || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  const identity = resolution.identity;
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || null;

  req.ctx = {
    userId: identity.userId,
    collegeId:
      // Admin-console tokens scope collegeId to '*' (cross-tenant). Honor the
      // explicit x-college-id header in that case so admin actions target the
      // intended tenant instead of an empty wildcard queue.
      identity.collegeId === '*' ? headerCollegeId || 'unknown' : identity.collegeId || headerCollegeId || 'unknown',
    requestId,
    roles: identity.roles,
    isAuthenticated: identity.isAuthenticated,
    idempotencyKey
  };

  // RBAC Enforcement for Moderation Endpoints — role must come from a
  // cryptographically verified JWT; guest/header roles can never moderate.
  if (req.url.startsWith('/api/v1/confessions/moderation')) {
    if (!isModerator(identity)) {
      reply.status(403).send({
        success: false,
        error: { code: 'MODERATION_ACCESS_DENIED', message: 'Moderation privileges required to access this endpoint.' },
        metadata: { requestId, collegeId: req.ctx.collegeId, timestamp: new Date().toISOString() }
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
