/**
 * Campus Connect — Mentorship Controller (~35 lines)
 * Thin REST Controller delegating mentorship pairing to ConnectUseCases and ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../queries/connect.queries.js';

export class MentorshipController {
  constructor(
    private readonly useCases: ConnectUseCases,
    private readonly queryService: ConnectQueryService
  ) {}

  async createMentorship(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as any;
    const mId = `m_${Date.now()}`;
    const result = await this.useCases.createMentorship({
      id: mId,
      collegeId: request.connectContext.collegeId,
      mentorId: body?.mentorId || request.connectContext.userId,
      menteeId: body?.menteeId || 'usr_mentee',
      createdBy: request.connectContext.userId
    });
    reply.status(201).send(formatApiV1Success(result, request));
  }

  async getMentorships(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const mentorships = await this.queryService.getMentorships(request.connectContext.userId, request.connectContext.collegeId);
    reply.send(formatApiV1Success(mentorships, request));
  }
}
