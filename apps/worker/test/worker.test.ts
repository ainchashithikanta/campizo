import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { loadEnv } from '@college-hub/config';
import { WorkerRuntime } from '../src/runtime.js';
import { startHealthServer } from '../src/http.js';

function setRequiredEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://collegehub_user:collegehub_password@127.0.0.1:1/collegehub_db';
  process.env.REDIS_URL = 'redis://127.0.0.1:1';
  process.env.JWT_SECRET = 'x'.repeat(32);
  process.env.ENCRYPTION_KEY_32_BYTES = 'a'.repeat(32);
}

describe('Production Worker Runtime (MS-54)', () => {
  beforeAll(() => {
    setRequiredEnv();
  });

  it('validates the environment configuration at boot', () => {
    const env = loadEnv(process.env);
    expect(env.DATABASE_URL).toContain('postgresql://');
    expect(env.REDIS_URL).toContain('redis://');
    expect(env.GRACEFUL_SHUTDOWN_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('registers background worker tasks and rejects duplicate registrations', async () => {
    const runtime = new WorkerRuntime(loadEnv(process.env));
    runtime.registerTask('stats-engine', async () => undefined);
    runtime.registerTask('search-index', async () => undefined);

    expect(runtime.getRegisteredTasks()).toEqual(['stats-engine', 'search-index']);
    expect(() => runtime.registerTask('stats-engine', async () => undefined)).toThrow(/already registered/);
    await runtime.stop();
  });

  it('reports DEGRADED readiness when Redis and PostgreSQL are unreachable', async () => {
    const runtime = new WorkerRuntime(loadEnv(process.env), { redisConnectTimeoutMs: 300 });
    await runtime.start();
    const report = await runtime.readiness();

    expect(report.status).toBe('DEGRADED');
    expect(report.redis.name).toBe('redis');
    expect(report.redis.healthy).toBe(false);
    expect(report.postgres.name).toBe('postgres');
    expect(report.postgres.healthy).toBe(false);
    await runtime.stop();
  });

  it('exposes liveness and readiness endpoints over HTTP', async () => {
    const runtime = new WorkerRuntime(loadEnv(process.env), { redisConnectTimeoutMs: 300 });
    const server = await startHealthServer(runtime, 0);
    const port = (server.address() as AddressInfo).port;

    const liveRes = await fetch(`http://127.0.0.1:${port}/health/live`);
    expect(liveRes.status).toBe(200);
    const liveBody = (await liveRes.json()) as { status: string };
    expect(liveBody.status).toBe('OK');

    const readyRes = await fetch(`http://127.0.0.1:${port}/health/ready`);
    expect(readyRes.status).toBe(503);
    const readyBody = (await readyRes.json()) as { status: string };
    expect(readyBody.status).toBe('DEGRADED');

    const missingRes = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(missingRes.status).toBe(404);

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await runtime.stop();
  });

  it('stops gracefully and releases connections', async () => {
    const runtime = new WorkerRuntime(loadEnv(process.env), { redisConnectTimeoutMs: 300 });
    await runtime.start();
    await expect(runtime.stop()).resolves.toBeUndefined();
  });
});

describe('Worker Health Server Lifecycle (MS-54)', () => {
  let server: Server;

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it('starts and serves the live endpoint', async () => {
    setRequiredEnv();
    const runtime = new WorkerRuntime(loadEnv(process.env), { redisConnectTimeoutMs: 300 });
    server = await startHealthServer(runtime, 0);
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/health/live`);
    expect(res.status).toBe(200);
    await runtime.stop();
  });
});
