import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { tenantContextPlugin, resolveTenantFromRequest } from '../src/plugins/tenant-context.plugin.js';

describe('Tenant Context Resolution & Concurrent Request Isolation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(tenantContextPlugin);

    app.get('/test-tenant', async (request, reply) => {
      return reply.send({
        success: true,
        traceId: request.traceId,
        tenant: request.tenantContext
      });
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should resolve tenant via custom domain (hub.stanford.edu)', () => {
    const mockReq = {
      headers: { host: 'hub.stanford.edu' }
    };
    const tenant = resolveTenantFromRequest(mockReq as any);
    expect(tenant?.collegeId).toBe('college-stanford-001');
    expect(tenant?.collegeSlug).toBe('stanford');
  });

  it('should resolve tenant via subdomain (mit.collegehub.com)', () => {
    const mockReq = {
      headers: { host: 'mit.collegehub.com' }
    };
    const tenant = resolveTenantFromRequest(mockReq as any);
    expect(tenant?.collegeId).toBe('college-mit-002');
    expect(tenant?.collegeSlug).toBe('mit');
  });

  it('should resolve tenant via explicit X-College-ID header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-tenant',
      headers: {
        'x-college-id': 'college-mit-002'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.tenant.collegeId).toBe('college-mit-002');
    expect(body.tenant.collegeSlug).toBe('mit');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('should return 404 UNKNOWN_TENANT for invalid explicit college ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-tenant',
      headers: {
        host: 'non-existent.com',
        'x-college-id': 'invalid-college-999'
      }
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('UNKNOWN_TENANT');
  });

  it('should guarantee complete context isolation across concurrent requests', async () => {
    // Fire 20 parallel concurrent requests with alternating tenant IDs
    const requests = Array.from({ length: 20 }, (_, i) => {
      const isEven = i % 2 === 0;
      const targetTenantId = isEven ? 'college-stanford-001' : 'college-mit-002';
      const targetSlug = isEven ? 'stanford' : 'mit';

      return app
        .inject({
          method: 'GET',
          url: '/test-tenant',
          headers: {
            'x-college-id': targetTenantId,
            'x-request-id': `trace-req-${i}`
          }
        })
        .then((res) => {
          const payload = JSON.parse(res.payload);
          return {
            index: i,
            expectedTenantId: targetTenantId,
            expectedSlug: targetSlug,
            actualTenantId: payload.tenant.collegeId,
            actualSlug: payload.tenant.collegeSlug,
            traceId: payload.traceId
          };
        });
    });

    const results = await Promise.all(requests);

    for (const res of results) {
      expect(res.actualTenantId).toBe(res.expectedTenantId);
      expect(res.actualSlug).toBe(res.expectedSlug);
      expect(res.traceId).toBe(`trace-req-${res.index}`);
    }
  });
});
