import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';

describe('Production Health Probes & Graceful Shutdown (MS-54)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://collegehub_user:collegehub_password@127.0.0.1:1/collegehub_db';
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.DATABASE_URL;
  });

  it('/health/live returns 200 with OK status while process is alive', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('OK');
    expect(body.timestamp).toBeDefined();
  });

  it('/health/ready returns 503 with structured dependency report when PostgreSQL is unreachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('DEGRADED');
    expect(body.checks.postgres).toBeDefined();
    expect(body.checks.postgres.name).toBe('postgres');
    expect(body.checks.postgres.healthy).toBe(false);
  });

  it('/health returns comprehensive dependency status payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect([200, 503]).toContain(res.statusCode);
    const body = JSON.parse(res.payload);
    expect(body.status).toBeDefined();
    expect(body.database).toBeDefined();
    expect(body.redis).toBeDefined();
    expect(body.storage).toBeDefined();
    expect(typeof body.uptime).toBe('number');
    expect(body.version).toBeDefined();
  });

  it('closes cleanly and releases health probe resources on shutdown', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect([200, 503]).toContain(res.statusCode);
    await expect(app.close()).resolves.toBeUndefined();
  });
});
