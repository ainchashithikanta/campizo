import type { FastifyInstance } from 'fastify';
import { createDatabaseClient, checkDatabaseHealth } from '@college-hub/database';
import type { Pool } from 'pg';

export interface DependencyHealth {
  name: string;
  healthy: boolean;
  latencyMs: number;
}

export interface ReadinessReport {
  status: 'OK' | 'DEGRADED';
  checks: Record<string, DependencyHealth>;
  timestamp: string;
}

export interface StartupReport {
  status: 'OK' | 'STARTING';
  timestamp: string;
}

export type DependencyChecker = () => Promise<DependencyHealth>;

export interface ApiHealthProbesOptions {
  checkers?: DependencyChecker[];
  startupCheck?: () => Promise<boolean>;
  onPoolCreated?: (pool: Pool) => void;
}

export class ApiHealthProbes {
  private pool: Pool | null = null;
  private readonly checkers: DependencyChecker[];
  private readonly startupCheck: (() => Promise<boolean>) | undefined;
  private readonly onPoolCreated: ((pool: Pool) => void) | undefined;

  constructor(options: ApiHealthProbesOptions = {}) {
    this.checkers = options.checkers ?? [];
    this.startupCheck = options.startupCheck;
    this.onPoolCreated = options.onPoolCreated;
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = createDatabaseClient().pool;
      this.onPoolCreated?.(this.pool);
    }
    return this.pool;
  }

  public registerChecker(checker: DependencyChecker): void {
    this.checkers.push(checker);
  }

  public async checkDatabase(): Promise<DependencyHealth> {
    const result = await checkDatabaseHealth(this.getPool());
    return { name: 'postgres', healthy: result.healthy, latencyMs: result.latencyMs };
  }

  public async readiness(): Promise<ReadinessReport> {
    const results = await Promise.all(this.checkers.map((checker) => checker()));
    const checks: Record<string, DependencyHealth> = {};
    let healthy = true;
    for (const result of results) {
      checks[result.name] = result;
      if (!result.healthy) {
        healthy = false;
      }
    }
    return {
      status: healthy ? 'OK' : 'DEGRADED',
      checks,
      timestamp: new Date().toISOString()
    };
  }

  public async startup(): Promise<StartupReport> {
    const ready = this.startupCheck ? await this.startupCheck() : true;
    return {
      status: ready ? 'OK' : 'STARTING',
      timestamp: new Date().toISOString()
    };
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export function registerHealthProbes(app: FastifyInstance, probes: ApiHealthProbes): void {
  app.get('/health/live', async () => ({
    status: 'OK',
    timestamp: new Date().toISOString()
  }));

  app.get('/health/ready', async (_request, reply) => {
    const report = await probes.readiness();
    reply.status(report.status === 'OK' ? 200 : 503).send(report);
  });

  app.get('/health/startup', async (_request, reply) => {
    const report = await probes.startup();
    reply.status(report.status === 'OK' ? 200 : 503).send(report);
  });
}
