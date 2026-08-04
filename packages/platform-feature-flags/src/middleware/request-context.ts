/**
 * Shared RequestContext Middleware
 * Populates immutable request metadata across all Fastify request lifecycles.
 */

export interface RequestContext {
  requestId: string;
  traceId: string;
  collegeId: string;
  userId: string;
  roles: string[];
  idempotencyKey?: string | undefined;
  environment: 'DEVELOPMENT' | 'TESTING' | 'STAGING' | 'PRODUCTION';
  timestamp: string;
}

export function buildRequestContext(reqHeaders: Record<string, string | string[] | undefined>): RequestContext {
  const getHeader = (key: string): string => {
    const val = reqHeaders[key.toLowerCase()];
    if (Array.isArray(val)) return val[0] || '';
    return val || '';
  };

  const requestId = getHeader('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const traceId = getHeader('x-trace-id') || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const collegeId = getHeader('x-college-id') || 'global';
  const userId = getHeader('x-user-id') || 'anonymous';
  const rolesRaw = getHeader('x-user-roles') || 'READONLY_ADMIN';
  const roles = rolesRaw.split(',').map((r) => r.trim());
  const idempotencyKey = getHeader('x-idempotency-key') || undefined;
  const envRaw = getHeader('x-client-environment') || 'PRODUCTION';

  const validEnvs = ['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION'];
  const environment = (validEnvs.includes(envRaw.toUpperCase()) ? envRaw.toUpperCase() : 'PRODUCTION') as RequestContext['environment'];

  return {
    requestId,
    traceId,
    collegeId,
    userId,
    roles,
    idempotencyKey,
    environment,
    timestamp: new Date().toISOString()
  };
}
