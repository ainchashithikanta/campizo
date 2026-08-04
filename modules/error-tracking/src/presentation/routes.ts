/**
 * Error Tracking & Incident Response — Fastify Route Plugin (MS-56)
 * Registers the six REST endpoints consumed by the incident response console:
 *   GET    /errors
 *   GET    /errors/statistics
 *   GET    /errors/:id
 *   GET    /incidents
 *   GET    /incidents/:id
 *   PATCH  /incidents/:id/status
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import type { ErrorTracker } from '../core/error-tracker.js';
import { ErrorTrackingController } from './controller.js';

export interface ErrorTrackingRoutesOptions {
  tracker: ErrorTracker;
}

export function registerErrorTrackingRoutes(fastify: FastifyInstance, options: ErrorTrackingRoutesOptions): void {
  const controller = new ErrorTrackingController(options.tracker);

  function safe(handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>): typeof handler {
    return async (req, reply) => {
      try {
        await handler(req, reply);
      } catch (err) {
        if (err instanceof ZodError) {
          reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request parameters',
              details: err.flatten()
            }
          });
          return;
        }
        throw err;
      }
    };
  }

  fastify.get(
    '/errors',
    safe((req, reply) => controller.listErrors(req, reply))
  );
  fastify.get(
    '/errors/statistics',
    safe((req, reply) => controller.getStatistics(req, reply))
  );
  fastify.get(
    '/errors/:id',
    safe((req, reply) => controller.getError(req, reply))
  );

  fastify.get(
    '/incidents',
    safe((req, reply) => controller.listIncidents(req, reply))
  );
  fastify.get(
    '/incidents/:id',
    safe((req, reply) => controller.getIncident(req, reply))
  );
  fastify.patch(
    '/incidents/:id/status',
    safe((req, reply) => controller.updateIncidentStatus(req, reply))
  );
}
