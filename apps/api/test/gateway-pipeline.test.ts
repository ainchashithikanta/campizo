import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';

describe('API Gateway, Security Middleware & Request Pipeline (MS-17)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should generate x-request-id and x-correlation-id headers automatically', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(res.headers['x-request-id']).toBe(res.headers['x-correlation-id']);
  });

  it('should inject security headers (Helmet HSTS, X-Frame-Options, CSP)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should process CORS origin validation headers', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://stanford.collegehub.edu',
        'access-control-request-method': 'GET'
      }
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://stanford.collegehub.edu');
  });

  it('should process x-idempotency-key headers on requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-idempotency-key': 'idempotency-key-uuid-12345'
      }
    });

    expect(res.statusCode).toBe(200);
  });

  it('should return standardized API error envelope for missing routes or exceptions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/non-existent-endpoint-xyz'
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);

    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeDefined();
  });
});
