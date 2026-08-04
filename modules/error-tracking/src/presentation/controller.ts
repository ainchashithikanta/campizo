/**
 * Error Tracking & Incident Response — Fastify REST Controllers (MS-56)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ErrorTracker } from '../core/error-tracker.js';
import {
  ErrorQuerySchema,
  IncidentQuerySchema,
  ErrorParamsSchema,
  IncidentParamsSchema,
  UpdateIncidentStatusSchema
} from './validators.js';

export class ErrorTrackingController {
  constructor(private readonly tracker: ErrorTracker) {}

  async listErrors(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = ErrorQuerySchema.parse(req.query);
    const result = this.tracker.listErrors(query);
    reply.status(200).send({
      success: true,
      data: result,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async getError(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = ErrorParamsSchema.parse(req.params);
    const error = this.tracker.getError(id);
    if (!error) {
      reply.status(404).send({
        success: false,
        error: { code: 'ERROR_NOT_FOUND', message: `Tracked error '${id}' not found` }
      });
      return;
    }
    reply.status(200).send({
      success: true,
      data: error,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async getStatistics(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const statistics = this.tracker.getErrorsStatistics();
    reply.status(200).send({
      success: true,
      data: statistics,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async listIncidents(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = IncidentQuerySchema.parse(req.query);
    const result = this.tracker.listIncidents(query);
    reply.status(200).send({
      success: true,
      data: result,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async getIncident(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = IncidentParamsSchema.parse(req.params);
    const incident = this.tracker.getIncident(id);
    if (!incident) {
      reply.status(404).send({
        success: false,
        error: { code: 'INCIDENT_NOT_FOUND', message: `Incident '${id}' not found` }
      });
      return;
    }
    reply.status(200).send({
      success: true,
      data: incident,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async updateIncidentStatus(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = IncidentParamsSchema.parse(req.params);
    const body = UpdateIncidentStatusSchema.parse(req.body);

    const incident = this.tracker.updateIncidentStatus(id, body.status, body.actor, body.note);
    if (!incident) {
      reply.status(404).send({
        success: false,
        error: { code: 'INCIDENT_NOT_FOUND', message: `Incident '${id}' not found` }
      });
      return;
    }
    reply.status(200).send({
      success: true,
      data: incident,
      metadata: { timestamp: new Date().toISOString() }
    });
  }
}
