import { createServer, type Server } from 'node:http';
import { logger } from '@college-hub/logger';
import { tryGetErrorTracker } from '@college-hub/mod-error-tracking';
import { observability } from '@college-hub/observability';
import type { WorkerRuntime } from './runtime.js';

export function startHealthServer(runtime: WorkerRuntime, port: number): Promise<Server> {
  const server = createServer(async (req, res) => {
    const url = req.url || '/';

    if (url === '/health/live') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'OK',
          uptimeMs: runtime.getUptimeMs(),
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (url === '/health/ready' || url === '/health') {
      const report = await runtime.readiness();
      res.writeHead(report.status === 'OK' ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify(report));
      return;
    }

    if (url === '/metrics' && process.env.METRICS_ENABLED !== 'false') {
      res.writeHead(200, { 'content-type': observability.registry.contentType });
      res.end(await observability.registry.metrics());
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND' } }));
  });

  server.on('clientError', (err, socket) => {
    tryGetErrorTracker()?.recordDependencyFailure('health', err, { task: 'health-server' });
    logger.warn({ err }, 'HTTP client error on worker health server');
    socket.destroy();
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      logger.info({ port }, 'Worker health server listening');
      resolve(server);
    });
  });
}
