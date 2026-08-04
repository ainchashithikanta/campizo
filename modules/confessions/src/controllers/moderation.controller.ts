import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConfessionUseCases } from '../use-cases/confession.use-cases.js';
import { ConfessionQueries } from '../queries/confession.queries.js';
import { moderationDecisionSchema } from '../validators/confession.validators.js';

export class ModerationController {
  constructor(
    private useCases: ConfessionUseCases,
    private queries: ConfessionQueries
  ) {}

  async getQueue(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { collegeId, requestId } = req.ctx;
    const cases = await this.queries.getModerationQueue(collegeId);

    // Enforce 100% blind identity for moderators — strip all identity fields
    const blindCases = cases.map((c) => ({
      id: c.id,
      collegeId: c.collegeId,
      confessionId: c.confessionId,
      severityLevel: c.severityLevel,
      status: c.status,
      totalReports: c.totalReports,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      authorIdentity: 'BLIND'
    }));

    reply.status(200).send({
      success: true,
      data: blindCases,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    });
  }

  async recordDecision(req: FastifyRequest<{ Params: { caseId: string } }>, reply: FastifyReply): Promise<void> {
    const { collegeId, userId: moderatorUserId, requestId } = req.ctx;
    const body = moderationDecisionSchema.parse(req.body);

    await this.useCases.recordModerationDecision({
      collegeId,
      caseId: req.params.caseId,
      moderatorUserId,
      action: body.action,
      ...(body.reasonNote !== undefined ? { reasonNote: body.reasonNote } : {})
    });

    reply.status(200).send({
      success: true,
      data: { caseId: req.params.caseId, action: body.action },
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    });
  }
}
