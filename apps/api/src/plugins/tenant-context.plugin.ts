import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';
import { TraceContextStore } from '@college-hub/logger';
import { SubscriptionTier, type TenantContextDto, type ApiV1ErrorResponse } from '@college-hub/types';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    tenantContext: TenantContextDto;
  }
}

// In-memory tenant registry lookup table (simulates cached Redis/DB tenant records)
const KNOWN_TENANTS_MAP: Record<string, TenantContextDto & { customDomain?: string }> = {
  'college-stanford-001': {
    collegeId: 'college-stanford-001',
    collegeSlug: 'stanford',
    enabledModules: ['rate-my-professor', 'materials-pyqs', 'auth', 'marketplace'],
    tier: SubscriptionTier.ENTERPRISE,
    customDomain: 'hub.stanford.edu'
  },
  'college-mit-002': {
    collegeId: 'college-mit-002',
    collegeSlug: 'mit',
    enabledModules: ['rate-my-professor', 'marketplace', 'confessions', 'auth'],
    tier: SubscriptionTier.PRO,
    customDomain: 'hub.mit.edu'
  }
};

export function resolveTenantFromRequest(request: FastifyRequest): TenantContextDto | null {
  const host = request.headers.host || '';
  const collegeHeader = (request.headers['x-college-id'] || request.headers['X-College-ID']) as string | undefined;
  const slugHeader = (request.headers['x-college-slug'] || request.headers['X-College-Slug']) as string | undefined;

  // Priority 1: Explicit Header Resolution (X-College-ID or X-College-Slug)
  if (collegeHeader) {
    return KNOWN_TENANTS_MAP[collegeHeader] || null;
  }
  if (slugHeader) {
    const match = Object.values(KNOWN_TENANTS_MAP).find((t) => t.collegeSlug === slugHeader.toLowerCase());
    return match || null;
  }

  // Priority 2: Custom Domain Resolution (e.g. hub.stanford.edu)
  for (const tenant of Object.values(KNOWN_TENANTS_MAP)) {
    if (tenant.customDomain && host.toLowerCase().includes(tenant.customDomain.toLowerCase())) {
      return tenant;
    }
  }

  // Priority 3: Subdomain Resolution (e.g. stanford.collegehub.com)
  if (host.includes('.')) {
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] && parts[0] !== 'www' && parts[0] !== 'api') {
      const subdomainSlug = parts[0].toLowerCase();
      const match = Object.values(KNOWN_TENANTS_MAP).find((t) => t.collegeSlug === subdomainSlug);
      if (match) return match;
    }
  }

  // Priority 4: Development / Localhost Fallback
  if (process.env.NODE_ENV === 'development' || host.includes('localhost') || host.includes('127.0.0.1')) {
    return KNOWN_TENANTS_MAP['college-stanford-001'] || null;
  }

  return null;
}

async function tenantContextPluginRaw(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Generate / Extract Trace & Request Correlation ID
    const incomingTraceId = (request.headers['x-request-id'] || request.headers['x-correlation-id']) as
      string | undefined;
    const traceId = incomingTraceId || randomUUID();
    request.traceId = traceId;
    reply.header('x-request-id', traceId);

    // Skip tenant resolution for health probe endpoints (liveness/readiness/module)
    if (request.url === '/health' || request.url.startsWith('/health/')) {
      return;
    }

    // 2. Resolve Tenant Context
    const resolvedTenant = resolveTenantFromRequest(request);

    if (!resolvedTenant) {
      const errorResponse: ApiV1ErrorResponse = {
        success: false,
        error: {
          code: 'UNKNOWN_TENANT',
          message: 'Unable to resolve valid college tenant context for request'
        }
      };
      return reply.status(404).send(errorResponse);
    }

    request.tenantContext = resolvedTenant;

    // 3. Store Tenant & Trace Context in AsyncLocalStorage for downstream logging/database access
    TraceContextStore.enterWith({
      traceId,
      tenantId: resolvedTenant.collegeId,
      serviceName: 'api-gateway'
    });
  });
}

export const tenantContextPlugin = fp(tenantContextPluginRaw, {
  name: 'tenantContextPlugin'
});
