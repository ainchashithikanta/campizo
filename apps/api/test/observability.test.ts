import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';

describe('Observability Platform HTTP Endpoints (MS-55)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://collegehub_user:collegehub_password@127.0.0.1:1/collegehub_db';
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.DATABASE_URL;
  });

  it('GET /metrics returns Prometheus text exposition', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.payload).toContain('# HELP collegehub_http_requests_total');
  });

  it('records HTTP request metrics for served routes', async () => {
    await app.inject({ method: 'GET', url: '/health/live' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toContain('collegehub_http_requests_total{method="GET",route="/health/live",status="200"');
    expect(res.payload).toContain('collegehub_http_requests_in_flight{method="GET",route="/health/live"');
  });

  it('GET /health/startup reports OK once modules are active', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/startup' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('OK');
    expect(body.timestamp).toBeDefined();
  });

  it('hides /metrics when METRICS_ENABLED is false', async () => {
    await app.close();
    delete process.env.DATABASE_URL;

    process.env.METRICS_ENABLED = 'false';
    const disabledApp = await buildApp();
    try {
      const res = await disabledApp.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(404);
    } finally {
      await disabledApp.close();
      delete process.env.METRICS_ENABLED;
    }
  });
});
