/**
 * Campus Connect — Notification Controller (~30 lines)
 * Thin REST Controller delegating notification feed retrieval to ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectQueryService } from '../queries/connect.queries.js';

export class NotificationController {
  constructor(private readonly queryService: ConnectQueryService) {}

  async getNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const notifications = await this.queryService.getNotifications(request.context.userId, request.context.collegeId);
    reply.send(formatApiV1Success(notifications, request));
  }
}
