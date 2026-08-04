/**
 * Campus Connect — Student Intent Controller (~50 lines)
 * Thin REST Controller delegating strictly to StudentIntentService / ConnectUseCases.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { StudentIntentService } from '../use-cases/connect.use-cases.js';
import {
  createIntentSchema,
  updateIntentSchema,
  intentStateTransitionSchema
} from '../validators/intent.validators.js';

export class IntentController {
  constructor(private readonly intentService: StudentIntentService) {}

  async createIntent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = createIntentSchema.parse(request.body);
    const intentId = `int_${Date.now()}`;
    const result = await this.intentService.createIntent({
      id: intentId,
      collegeId: request.context.collegeId,
      studentProfileId: request.context.userId,
      createdBy: request.context.userId,
      ...input
    });
    reply.status(201).send(formatApiV1Success(result, request));
  }

  async updateIntent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const input = updateIntentSchema.parse(request.body);
    const result = await this.intentService.updateIntent({
      id,
      collegeId: request.context.collegeId,
      title: input.title,
      version: input.version,
      updatedBy: request.context.userId
    });
    reply.send(formatApiV1Success(result, request));
  }

  async pauseIntent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const { version } = intentStateTransitionSchema.parse(request.body || { version: 1 });
    await this.intentService.pauseIntent(id, request.context.collegeId, version);
    reply.send(formatApiV1Success({ status: 'PAUSED', intentId: id }, request));
  }

  async fulfillIntent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const { version } = intentStateTransitionSchema.parse(request.body || { version: 1 });
    await this.intentService.fulfillIntent(id, request.context.collegeId, version);
    reply.send(formatApiV1Success({ status: 'FULFILLED', intentId: id }, request));
  }

  async archiveIntent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const { version } = intentStateTransitionSchema.parse(request.body || { version: 1 });
    await this.intentService.archiveIntent(id, request.context.collegeId, version);
    reply.send(formatApiV1Success({ status: 'ARCHIVED', intentId: id }, request));
  }
}
