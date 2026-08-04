import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GetContributorProfileQuery } from '../index.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export interface ContributorControllerDependencies {
  getContributorProfileQuery: GetContributorProfileQuery;
}

export function registerContributorRoutes(app: FastifyInstance, deps: ContributorControllerDependencies): void {
  // 1. Get Contributor Profile
  app.get(
    '/api/v1/contributors/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const profile = await deps.getContributorProfileQuery.execute(request.params.id, collegeId);
        return reply.send({
          success: true,
          data: profile || { userId: request.params.id, reputationScore: 0, badgeLevel: 'CONTRIBUTOR' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 2. Get Contributor Uploads
  app.get(
    '/api/v1/contributors/:id/resources',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: [],
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    }
  );

  // 3. Get Contributor Collections
  app.get(
    '/api/v1/contributors/:id/collections',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: [],
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    }
  );
}
