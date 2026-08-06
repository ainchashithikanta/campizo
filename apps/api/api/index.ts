import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../src/server.js';

/**
 * Vercel serverless entrypoint for the College Hub API.
 * Boots the Fastify application once per lambda instance, then forwards
 * incoming requests to Fastify's HTTP server for full route handling.
 */
let app: Awaited<ReturnType<typeof buildApp>> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    app ??= await buildApp();
    await app.ready();
    app.server.emit('request', req as never, res as never);
  } catch (err) {
    console.error('[vercel] failed to initialize API', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: { code: 'INIT_FAILED', message: 'API failed to initialize' }
        })
      );
    }
  }
}
