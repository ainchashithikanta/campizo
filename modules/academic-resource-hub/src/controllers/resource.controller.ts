import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  ResourceSearchQuerySchema,
  ResourceCreateSchema,
  ResourceVersionCreateSchema,
  VoteSchema,
  ReportSchema
} from '../validators/academic-resource.validators.js';
import type {
  CreateAcademicResourceUseCase,
  PublishAcademicResourceUseCase,
  ArchiveAcademicResourceUseCase,
  ReplaceAcademicResourceUseCase,
  CreateResourceVersionUseCase,
  PublishVersionUseCase,
  RollbackVersionUseCase,
  BookmarkResourceUseCase,
  VoteHelpfulUseCase,
  ReportResourceUseCase,
  RecordDownloadUseCase,
  RecordViewUseCase,
  SearchResourcesQuery,
  GetResourceDetailQuery
} from '../index.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export interface ResourceControllerDependencies {
  createResourceUC: CreateAcademicResourceUseCase;
  publishResourceUC: PublishAcademicResourceUseCase;
  archiveResourceUC: ArchiveAcademicResourceUseCase;
  replaceResourceUC: ReplaceAcademicResourceUseCase;
  createVersionUC: CreateResourceVersionUseCase;
  publishVersionUC: PublishVersionUseCase;
  rollbackVersionUC: RollbackVersionUseCase;
  bookmarkResourceUC: BookmarkResourceUseCase;
  voteHelpfulUC: VoteHelpfulUseCase;
  reportResourceUC: ReportResourceUseCase;
  recordDownloadUC: RecordDownloadUseCase;
  recordViewUC: RecordViewUseCase;
  searchResourcesQuery: SearchResourcesQuery;
  getResourceDetailQuery: GetResourceDetailQuery;
}

export function registerResourceRoutes(app: FastifyInstance, deps: ResourceControllerDependencies): void {
  // 1. List & Search Resources
  app.get('/api/v1/resources', async (request: FastifyRequest, reply: FastifyReply) => {
    const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
    const parsed = ResourceSearchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: parsed.error.message }
      });
    }

    try {
      const data = await deps.searchResourcesQuery.execute(collegeId, parsed.data.subjectId, parsed.data.query);
      return reply.send({
        success: true,
        data,
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    } catch (err: any) {
      return handleHttpError(err, request, reply);
    }
  });

  // 2. Search Shortcut
  app.get('/api/v1/resources/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
    const parsed = ResourceSearchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: parsed.error.message }
      });
    }

    try {
      const data = await deps.searchResourcesQuery.execute(collegeId, parsed.data.subjectId, parsed.data.query);
      return reply.send({
        success: true,
        data,
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    } catch (err: any) {
      return handleHttpError(err, request, reply);
    }
  });

  // 3. Trending Resources
  app.get('/api/v1/resources/trending', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: [],
      meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
    });
  });

  // 4. Get Resource Detail
  app.get(
    '/api/v1/resources/:resourceId',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const detail = await deps.getResourceDetailQuery.execute(request.params.resourceId, collegeId);
        return reply.send({
          success: true,
          data: detail,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 5. Create Resource
  app.post('/api/v1/resources', async (request: FastifyRequest, reply: FastifyReply) => {
    const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
    const uploaderUserId = (request.headers['x-user-id'] as string) || 'guest-user-101';
    const parsed = ResourceCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: parsed.error.message }
      });
    }

    try {
      const resource = await deps.createResourceUC.execute({
        collegeId,
        uploaderUserId,
        departmentId: parsed.data.departmentId,
        subjectId: parsed.data.subjectId,
        resourceTypeId: parsed.data.resourceTypeId,
        title: parsed.data.title,
        slug: parsed.data.slug,
        academicYear: parsed.data.academicYear,
        semesterNumber: parsed.data.semesterNumber,
        isAnonymous: parsed.data.isAnonymous,
        fileSizeBytes: parsed.data.fileSizeBytes,
        mimeType: parsed.data.mimeType,
        sha256Hash: parsed.data.sha256Hash,
        fileName: parsed.data.fileName,
        storageKey: parsed.data.storageKey,
        ...(parsed.data.courseId !== undefined ? { courseId: parsed.data.courseId } : {}),
        ...(parsed.data.schemeId !== undefined ? { schemeId: parsed.data.schemeId } : {}),
        ...(parsed.data.examTypeId !== undefined ? { examTypeId: parsed.data.examTypeId } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.authorDisplayName !== undefined ? { authorDisplayName: parsed.data.authorDisplayName } : {})
      });
      return reply.status(201).send({
        success: true,
        data: resource,
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    } catch (err: any) {
      return handleHttpError(err, request, reply);
    }
  });

  // 6. Publish Resource
  app.patch(
    '/api/v1/resources/:resourceId/publish',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const resource = await deps.publishResourceUC.execute(request.params.resourceId, collegeId);
        return reply.send({
          success: true,
          data: resource,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 7. Archive Resource
  app.patch(
    '/api/v1/resources/:resourceId/archive',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const resource = await deps.archiveResourceUC.execute(request.params.resourceId, collegeId);
        return reply.send({
          success: true,
          data: resource,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 8. Replace Resource
  app.patch(
    '/api/v1/resources/:resourceId/replace',
    async (
      request: FastifyRequest<{ Params: { resourceId: string }; Body: { newVersionId: string } }>,
      reply: FastifyReply
    ) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const resource = await deps.replaceResourceUC.execute(
          request.params.resourceId,
          collegeId,
          request.body.newVersionId
        );
        return reply.send({
          success: true,
          data: resource,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 9. Soft-Delete Resource
  app.delete(
    '/api/v1/resources/:resourceId',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        await deps.archiveResourceUC.execute(request.params.resourceId, collegeId);
        return reply.send({
          success: true,
          data: { status: 'RESOURCE_DELETED' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 10. Version History Lineage
  app.get(
    '/api/v1/resources/:resourceId/versions',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: [],
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    }
  );

  // 11. Create Version
  app.post(
    '/api/v1/resources/:resourceId/versions',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const userId = (request.headers['x-user-id'] as string) || 'guest-user-101';
      const parsed = ResourceVersionCreateSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: parsed.error.message }
        });
      }

      try {
        const version = await deps.createVersionUC.execute(
          request.params.resourceId,
          collegeId,
          userId,
          ...(parsed.data.changelogNotes !== undefined ? [parsed.data.changelogNotes] : [])
        );
        return reply.status(201).send({
          success: true,
          data: version,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 12. Publish Version
  app.patch(
    '/api/v1/resources/:resourceId/versions/:versionId/publish',
    async (request: FastifyRequest<{ Params: { resourceId: string; versionId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const resource = await deps.publishVersionUC.execute(
          request.params.resourceId,
          request.params.versionId,
          collegeId
        );
        return reply.send({
          success: true,
          data: resource,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 13. Rollback Version
  app.patch(
    '/api/v1/resources/:resourceId/versions/:versionId/rollback',
    async (request: FastifyRequest<{ Params: { resourceId: string; versionId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      try {
        const resource = await deps.rollbackVersionUC.execute(
          request.params.resourceId,
          request.params.versionId,
          collegeId
        );
        return reply.send({
          success: true,
          data: resource,
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 14. Bookmark Resource
  app.post(
    '/api/v1/resources/:resourceId/bookmarks',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const userId = (request.headers['x-user-id'] as string) || 'guest-user-101';
      try {
        await deps.bookmarkResourceUC.execute(request.params.resourceId, userId, collegeId);
        return reply.status(201).send({
          success: true,
          data: { status: 'BOOKMARKED' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 15. Unbookmark Resource
  app.delete(
    '/api/v1/resources/:resourceId/bookmarks',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: { status: 'UNBOOKMARKED' },
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    }
  );

  // 16. Vote Helpful / Unhelpful
  app.post(
    '/api/v1/resources/:resourceId/votes',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const userId = (request.headers['x-user-id'] as string) || 'guest-voter-101';
      const parsed = VoteSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: parsed.error.message }
        });
      }

      try {
        await deps.voteHelpfulUC.execute(request.params.resourceId, userId, collegeId, parsed.data.isHelpful);
        return reply.send({
          success: true,
          data: { status: 'VOTE_RECORDED' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 17. Remove Vote
  app.delete(
    '/api/v1/resources/:resourceId/votes',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: { status: 'VOTE_REMOVED' },
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    }
  );

  // 18. Report Resource
  app.post(
    '/api/v1/resources/:resourceId/reports',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const userId = (request.headers['x-user-id'] as string) || 'guest-reporter-101';
      const parsed = ReportSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: parsed.error.message }
        });
      }

      try {
        await deps.reportResourceUC.execute(request.params.resourceId, userId, collegeId, parsed.data.reason);
        return reply.status(201).send({
          success: true,
          data: { status: 'REPORT_RECORDED' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 19. Record Download
  app.post(
    '/api/v1/resources/:resourceId/download',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const userId = (request.headers['x-user-id'] as string) || 'guest-user-101';
      try {
        await deps.recordDownloadUC.execute(request.params.resourceId, userId, collegeId);
        return reply.send({
          success: true,
          data: { downloadUrl: `https://storage.collegehub.edu/pre-signed/resource-${request.params.resourceId}.pdf` },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );

  // 20. Record View
  app.post(
    '/api/v1/resources/:resourceId/view',
    async (request: FastifyRequest<{ Params: { resourceId: string } }>, reply: FastifyReply) => {
      const collegeId = (request.headers['x-college-id'] as string) || 'default-college';
      const userId = (request.headers['x-user-id'] as string) || 'guest-user-101';
      try {
        await deps.recordViewUC.execute(request.params.resourceId, userId, collegeId);
        return reply.send({
          success: true,
          data: { status: 'VIEW_RECORDED' },
          meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
        });
      } catch (err: any) {
        return handleHttpError(err, request, reply);
      }
    }
  );
}
