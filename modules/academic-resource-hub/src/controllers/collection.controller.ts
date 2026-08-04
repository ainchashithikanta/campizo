import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CollectionCreateSchema,
  CollectionUpdateSchema,
  CollectionItemAddSchema,
  CollectionReorderSchema
} from '../validators/academic-resource.validators.js';
import type {
  CreateStudyCollectionUseCase,
  UpdateStudyCollectionUseCase,
  AddResourceToCollectionUseCase,
  RemoveResourceFromCollectionUseCase,
  GetStudyCollectionQuery
} from '../index.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export interface CollectionControllerDependencies {
  createCollectionUC: CreateStudyCollectionUseCase;
  updateCollectionUC: UpdateStudyCollectionUseCase;
  addResourceUC: AddResourceToCollectionUseCase;
  removeResourceUC: RemoveResourceFromCollectionUseCase;
  getCollectionQuery: GetStudyCollectionQuery;
}

export function registerCollectionRoutes(app: FastifyInstance, deps: CollectionControllerDependencies): void {
  // 1. List Collections
  app.get('/api/v1/collections', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: [],
      meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
    });
  });

  // 2. Get Collection Detail
  app.get(
    '/api/v1/collections/:collectionId',
    async (request: FastifyRequest<{ Params: { collectionId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const collection = await deps.getCollectionQuery.execute(request.params.collectionId, collegeId);
        return reply.send({
          success: true,
          data: collection,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 3. Create Study Collection
  app.post('/api/v1/collections', async (request: FastifyRequest, reply: FastifyReply) => {
    const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
    const ownerUserId = (request.headers['x-user-id'] as string) || 'guest-user-101';
    const parsed = CollectionCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: parsed.error.message }
      });
    }

    try {
      const collection = await deps.createCollectionUC.execute(
        collegeId,
        ownerUserId,
        parsed.data.title,
        ...(parsed.data.description !== undefined ? [parsed.data.description] : [])
      );
      return reply.status(201).send({
        success: true,
        data: collection,
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    } catch (err: any) {
      return handleHttpError(err, request, reply);
    }
  });

  // 4. Update Study Collection
  app.put(
    '/api/v1/collections/:collectionId',
    async (request: FastifyRequest<{ Params: { collectionId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const parsed = CollectionUpdateSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: parsed.error.message }
        });
      }

      try {
        const collection = await deps.updateCollectionUC.execute(
          request.params.collectionId,
          collegeId,
          parsed.data.title,
          ...(parsed.data.description !== undefined ? [parsed.data.description] : [])
        );
        return reply.send({
          success: true,
          data: collection,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 5. Delete Study Collection
  app.delete(
    '/api/v1/collections/:collectionId',
    async (request: FastifyRequest<{ Params: { collectionId: string } }>, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: { status: 'COLLECTION_DELETED' },
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    }
  );

  // 6. Add Resource to Collection
  app.post(
    '/api/v1/collections/:collectionId/resources',
    async (request: FastifyRequest<{ Params: { collectionId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const parsed = CollectionItemAddSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: parsed.error.message }
        });
      }

      try {
        await deps.addResourceUC.execute(request.params.collectionId, parsed.data.resourceId, collegeId);
        return reply.status(201).send({
          success: true,
          data: { status: 'RESOURCE_ADDED' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 7. Remove Resource from Collection
  app.delete(
    '/api/v1/collections/:collectionId/resources/:resourceId',
    async (request: FastifyRequest<{ Params: { collectionId: string; resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        await deps.removeResourceUC.execute(request.params.collectionId, request.params.resourceId, collegeId);
        return reply.send({
          success: true,
          data: { status: 'RESOURCE_REMOVED' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 8. Reorder Collection Items
  app.put(
    '/api/v1/collections/:collectionId/reorder',
    async (request: FastifyRequest<{ Params: { collectionId: string } }>, reply: FastifyReply) => {
      const parsed = CollectionReorderSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: parsed.error.message }
        });
      }

      return reply.send({
        success: true,
        data: { status: 'REORDERED' },
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    }
  );
}
