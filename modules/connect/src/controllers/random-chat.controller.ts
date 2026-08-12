/**
 * Campus Connect — Random Chat Controller
 * Omegle-style anonymous chat between opposite-gender students.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import type { ConnectUseCases } from '../use-cases/connect.use-cases.js';

export class RandomChatController {
  constructor(private readonly useCases: ConnectUseCases) {}

  async join(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId, collegeId, gender } = request.connectContext;
    if (!authenticatedStudent(gender, reply)) return;

    const result = await this.useCases.joinRandomChat({ userId, collegeId, gender: String(gender) });
    reply.send(formatApiV1Success(result, request));
  }

  async status(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId, collegeId } = request.connectContext;
    if (!userId || userId === 'usr_anonymous') {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const result = await this.useCases.getRandomChatStatus({ userId, collegeId });
    reply.send(formatApiV1Success(result, request));
  }

  async leave(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId, collegeId } = request.connectContext;
    if (!userId || userId === 'usr_anonymous') {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const result = await this.useCases.leaveRandomChat({ userId, collegeId });
    reply.send(formatApiV1Success(result, request));
  }
}

function authenticatedStudent(gender: string | undefined, reply: FastifyReply): boolean {
  if (!gender || !['MALE', 'FEMALE'].includes(gender)) {
    reply.status(403).send({
      success: false,
      error: {
        code: 'GENDER_REQUIRED',
        message: 'You must register and set your gender before using random chat. Visit /register.'
      }
    });
    return false;
  }
  return true;
}
