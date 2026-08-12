/**
 * Campus Connect — Student Auth Controller
 * Register / login / current-session endpoints. Registration persists a
 * student profile (with gender) used by the random chat matcher.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { formatApiV1Success } from '../errors/http-error-handler.js';
import { studentAuthService } from '../services/student-auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';
import type { ConnectUseCases } from '../use-cases/connect.use-cases.js';

export class AuthController {
  constructor(private readonly useCases: ConnectUseCases) {}

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = registerSchema.parse(request.body);
    const collegeId = input.collegeId || request.headers['x-college-id'] || 'college_stanford_001';

    let session;
    try {
      session = studentAuthService.register({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        gender: input.gender,
        collegeId: String(collegeId)
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'REGISTRATION_FAILED';
      if (code === 'ACCOUNT_EXISTS') {
        reply
          .status(409)
          .send({ success: false, error: { code, message: 'An account with this email already exists' } });
        return;
      }
      reply.status(400).send({ success: false, error: { code, message: code.replaceAll('_', ' ').toLowerCase() } });
      return;
    }

    // Persist a student profile so /connect/profile and gender lookups work.
    await this.useCases.repoProvider.profileRepo.save({
      id: session.user.id,
      userId: session.user.id,
      collegeId: session.user.collegeId,
      fullName: session.user.fullName,
      gender: session.user.gender,
      email: session.user.email,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    reply.status(201).send(formatApiV1Success(session, request));
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = loginSchema.parse(request.body);

    let session;
    try {
      session = studentAuthService.login({ email: input.email, password: input.password });
    } catch {
      reply
        .status(401)
        .send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }

    reply.send(formatApiV1Success(session, request));
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const account = studentAuthService.getAccountById(request.connectContext.userId);
    if (!account) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Session not found' } });
      return;
    }
    reply.send(
      formatApiV1Success(
        {
          user: {
            id: account.id,
            email: account.email,
            fullName: account.fullName,
            gender: account.gender,
            collegeId: account.collegeId
          },
          authenticated: true
        },
        request
      )
    );
  }
}
