/**
 * Campus Connect — Study Group Controller (~35 lines)
 * Thin REST Controller delegating study group operations to ConnectUseCases and ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../queries/connect.queries.js';

export class StudyGroupController {
  constructor(
    private readonly useCases: ConnectUseCases,
    private readonly queryService: ConnectQueryService
  ) {}

  async createStudyGroup(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as any;
    const sgId = `sg_${Date.now()}`;
    const result = await this.useCases.createStudyGroup({
      id: sgId,
      collegeId: request.context.collegeId,
      courseCode: body?.courseCode || 'CS101',
      title: body?.title || 'Study Pod',
      createdBy: request.context.userId
    });
    reply.status(201).send(formatApiV1Success(result, request));
  }

  async getStudyGroups(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { courseCode } = request.query as { courseCode?: string };
    const groups = await this.queryService.getStudyGroups(request.context.collegeId, courseCode);
    reply.send(formatApiV1Success(groups, request));
  }
}
