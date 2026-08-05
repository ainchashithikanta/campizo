/**
 * Campus Connect — Moderation Controller (~40 lines)
 * Thin REST Controller delegating user reporting and moderation actions to ConnectUseCases.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { ConnectUseCases } from '../use-cases/connect.use-cases.js';

export class ModerationController {
  constructor(private readonly useCases: ConnectUseCases) {}

  async reportUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as any;
    const caseId = `case_${Date.now()}`;
    await this.useCases.reportUser({
      caseId,
      collegeId: request.connectContext.collegeId,
      reportedUserId: body?.reportedUserId || 'usr_target',
      reporterUserId: request.connectContext.userId,
      reason: body?.reason || 'POLICY_VIOLATION'
    });
    reply.status(201).send(formatApiV1Success({ caseId, status: 'OPEN' }, request));
  }

  async recordModerationAction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as any;
    await this.useCases.recordModerationDecision({
      caseId: body?.caseId || 'case_default',
      collegeId: request.connectContext.collegeId,
      actionTaken: body?.actionTaken || 'WARN',
      moderatorId: request.connectContext.userId
    });
    reply.send(formatApiV1Success({ status: 'ACTION_RECORDED' }, request));
  }
}
