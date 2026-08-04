/**
 * Campus Connect — Project Controller (~35 lines)
 * Thin REST Controller delegating project team operations to ConnectUseCases and ConnectQueryService.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';
import { ConnectQueryService } from '../queries/connect.queries.js';

export class ProjectController {
  constructor(
    private readonly useCases: ConnectUseCases,
    private readonly queryService: ConnectQueryService
  ) {}

  async createProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as any;
    const projId = `proj_${Date.now()}`;
    const result = await this.useCases.createProjectTeam({
      id: projId,
      collegeId: request.context.collegeId,
      title: body?.title || 'Project Team',
      createdBy: request.context.userId
    });
    reply.status(201).send(formatApiV1Success(result, request));
  }

  async getProjects(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const projects = await this.queryService.getProjectTeams(request.context.collegeId);
    reply.send(formatApiV1Success(projects, request));
  }
}
