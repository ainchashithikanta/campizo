import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { TenantContext } from '@college-hub/types';
import { resolveApiIdentity, isModerator, generateAnonymousToken } from '@college-hub/security';
import {
  SearchProfessorsUseCase,
  GetProfessorProfileUseCase,
  GetProfessorStatisticsUseCase,
  SubmitReviewUseCase,
  EditReviewUseCase,
  DeleteReviewUseCase,
  GetReviewsUseCase,
  VoteHelpfulUseCase,
  RemoveVoteUseCase,
  ReportReviewUseCase,
  AddFacultyResponseUseCase,
  UpdateFacultyResponseUseCase,
  ModerateReviewUseCase,
  GetReviewModerationQueueUseCase,
  ListDepartmentsUseCase,
  AdminCreateProfessorUseCase,
  AdminUpdateProfessorUseCase,
  AdminDeleteProfessorUseCase,
  EntityNotFoundError,
  DuplicateReviewError,
  EditWindowExpiredError,
  ProfessorInactiveError,
  DuplicateVoteError,
  DuplicateReportError,
  UnauthorizedReviewError
} from '../index.js';

// Input Zod Validation Schemas
type ResolvedIdentity =
  | { error: string }
  | {
      userId: string;
      collegeId: string;
      roles: string[];
      isAuthenticated: boolean;
      displayName?: string;
      anonymousToken: string;
    };

export const SearchQuerySchema = z.object({
  query: z.string().optional(),
  dept: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20)
});

export const RatingDimensionsSchema = z
  .object({
    teachingClarity: z.number().min(1).max(5),
    gradingFairness: z.number().min(1).max(5),
    punctuality: z.number().min(1).max(5),
    approachability: z.number().min(1).max(5)
  })
  .partial();

export const ReviewCreateSchema = z.object({
  courseAssignmentId: z.string().uuid(),
  reviewText: z.string().min(20).max(1000),
  overallRating: z.number().min(1.0).max(5.0),
  isAnonymous: z.boolean().optional().default(true),
  gradeReceived: z.string().optional(),
  dimensions: RatingDimensionsSchema.optional()
});

export const ReviewModerationDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'HIDE', 'REJECT', 'RESTORE']),
  reasonNote: z.string().max(500).optional()
});

export const ReviewEditSchema = z.object({
  newReviewText: z.string().min(20).max(1000),
  newOverallRating: z.number().min(1.0).max(5.0)
});

export const VoteSchema = z.object({
  voteType: z.enum(['HELPFUL', 'UNHELPFUL'])
});

export const ReportSchema = z.object({
  reason: z.string().min(3),
  details: z.string().optional()
});

export const AdminListProfessorsQuerySchema = z.object({
  query: z.string().optional(),
  departmentId: z.string().optional()
});

export const AdminCreateProfessorSchema = z.object({
  departmentId: z.string().min(1),
  fullName: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphenated alphanumerics.'),
  designation: z.string().min(2).max(100),
  biography: z.string().max(2000).optional(),
  officialEmail: z.string().email().optional()
});

export const AdminUpdateProfessorSchema = z
  .object({
    departmentId: z.string().min(1).optional(),
    fullName: z.string().min(2).max(200).optional(),
    slug: z
      .string()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphenated alphanumerics.')
      .optional(),
    designation: z.string().min(2).max(100).optional(),
    status: z.string().min(2).max(30).optional(),
    biography: z.string().max(2000).optional(),
    officialEmail: z.string().email().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided.' });

export const FacultyResponseSchema = z.object({
  responseText: z.string().min(10).max(1000)
});

export function registerProfessorRoutes(
  app: FastifyInstance,
  useCases: {
    searchProfessors: SearchProfessorsUseCase;
    getProfile: GetProfessorProfileUseCase;
    getStats: GetProfessorStatisticsUseCase;
    getReviews: GetReviewsUseCase;
    submitReview: SubmitReviewUseCase;
    editReview: EditReviewUseCase;
    deleteReview?: DeleteReviewUseCase;
    voteHelpful: VoteHelpfulUseCase;
    removeVote?: RemoveVoteUseCase;
    reportReview: ReportReviewUseCase;
    addFacultyResponse: AddFacultyResponseUseCase;
    updateFacultyResponse?: UpdateFacultyResponseUseCase;
    getModerationQueue?: GetReviewModerationQueueUseCase;
    moderateReview?: ModerateReviewUseCase;
    listDepartments?: ListDepartmentsUseCase;
    adminCreateProfessor?: AdminCreateProfessorUseCase;
    adminUpdateProfessor?: AdminUpdateProfessorUseCase;
    adminDeleteProfessor?: AdminDeleteProfessorUseCase;
  }
): void {
  const resolveIdentity = (request: FastifyRequest): ResolvedIdentity => {
    const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
    const resolution = resolveApiIdentity({
      authorizationHeader: request.headers['authorization'] as string | undefined,
      collegeIdHeader: (request.headers['x-college-id'] as string) || tenantContext.collegeId,
      userIdHeader: request.headers['x-user-id'] as string | undefined
    });

    if (resolution.status === 'invalid_token' || resolution.status === 'config_error') {
      return { error: resolution.message };
    }

    const identity = resolution.identity;
    const headerCollegeId = (request.headers['x-college-id'] as string) || tenantContext.collegeId;
    return {
      userId: identity.userId,
      // Admin-console tokens scope collegeId to '*' (cross-tenant). Honor the
      // explicit x-college-id header in that case so admin actions target the
      // intended tenant instead of an empty wildcard queue.
      collegeId: identity.collegeId === '*' ? headerCollegeId : identity.collegeId || headerCollegeId,
      roles: identity.roles,
      isAuthenticated: identity.isAuthenticated,
      anonymousToken: generateAnonymousToken(identity.userId, tenantContext.collegeId),
      ...(identity.displayName !== undefined ? { displayName: identity.displayName } : {})
    };
  };

  const denyModeration = (reply: FastifyReply) => {
    reply.status(403).send({
      success: false,
      error: { code: 'MODERATION_ACCESS_DENIED', message: 'Moderation privileges required to access this endpoint.' }
    });
  };

  // 1. Search Professors Directory
  app.get('/api/v1/professors', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
    const queryResult = SearchQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_QUERY_PARAMS', message: queryResult.error.message }
      });
    }

    const professorsList = await useCases.searchProfessors.execute({
      collegeId: tenantContext.collegeId,
      ...(queryResult.data.query !== undefined ? { query: queryResult.data.query } : {}),
      ...(queryResult.data.dept !== undefined ? { departmentId: queryResult.data.dept } : {})
    });

    // Enrich each professor with rating statistics and department name so the
    // public directory page receives ProfessorSummaryDto-compatible payloads
    // (the raw ProfessorEntity does not carry stats or department shortName).
    const departments = useCases.listDepartments
      ? await useCases.listDepartments.execute({ collegeId: tenantContext.collegeId })
      : [];
    const deptMap = new Map<string, { name: string; shortName: string }>();
    for (const d of departments) deptMap.set(d.id, { name: d.name, shortName: d.shortName });

    const enriched = await Promise.all(
      professorsList.map(async (prof) => {
        const dept = deptMap.get(prof.departmentId);
        const stats = useCases.getStats
          ? await useCases.getStats.execute({ professorId: prof.id, collegeId: prof.collegeId })
          : { bayesianRating: 0, totalReviewsCount: 0, recommendationPercentage: 0, topTags: [] };
        return {
          id: prof.id,
          slug: prof.slug,
          fullName: prof.fullName,
          designation: prof.designation,
          departmentName: dept?.name ?? '',
          departmentCode: dept?.shortName ?? '',
          photoUrl: prof.photoUrl ?? null,
          bayesianRating: stats.bayesianRating,
          totalReviewsCount: stats.totalReviewsCount,
          recommendationPercentage: stats.recommendationPercentage,
          topTags: (stats as any).topTags ?? []
        };
      })
    );

    return reply.send({
      success: true,
      data: enriched,
      meta: {
        requestId: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  });

  // 2. Get Professor Profile
  app.get(
    '/api/v1/professors/:slug',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      try {
        const profile = await useCases.getProfile.execute({
          slug: request.params.slug,
          collegeId: tenantContext.collegeId
        });

        return reply.send({
          success: true,
          data: profile,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 3. Get Professor Statistics
  app.get(
    '/api/v1/professors/:slug/statistics',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      try {
        const profile = await useCases.getProfile.execute({
          slug: request.params.slug,
          collegeId: tenantContext.collegeId
        });

        const stats = await useCases.getStats.execute({
          professorId: profile.id,
          collegeId: tenantContext.collegeId
        });

        return reply.send({
          success: true,
          data: stats,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 4. Get Student Reviews List
  app.get(
    '/api/v1/professors/:slug/reviews',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      try {
        const profile = await useCases.getProfile.execute({
          slug: request.params.slug,
          collegeId: tenantContext.collegeId
        });

        const reviewsList = await useCases.getReviews.execute({
          professorId: profile.id,
          collegeId: tenantContext.collegeId
        });

        return reply.send({
          success: true,
          data: reviewsList,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 5. Submit Student Review (409 for duplicate review / inactive professor)
  app.post(
    '/api/v1/professors/:slug/reviews',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const bodyResult = ReviewCreateSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const profile = await useCases.getProfile.execute({
          slug: request.params.slug,
          collegeId: tenantContext.collegeId
        });

        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        const review = await useCases.submitReview.execute({
          collegeId: tenantContext.collegeId,
          professorId: profile.id,
          courseAssignmentId: bodyResult.data.courseAssignmentId,
          authorUserId: identity.userId,
          authorAnonymousToken: identity.anonymousToken,
          isAnonymous: bodyResult.data.isAnonymous,
          ...(bodyResult.data.gradeReceived !== undefined ? { gradeReceived: bodyResult.data.gradeReceived } : {}),
          reviewText: bodyResult.data.reviewText,
          overallRating: bodyResult.data.overallRating,
          ...(bodyResult.data.dimensions
            ? {
                dimensions: Object.fromEntries(
                  Object.entries(bodyResult.data.dimensions).filter(
                    (entry): entry is [string, number] => entry[1] !== undefined
                  )
                )
              }
            : {})
        });

        return reply.status(201).send({
          success: true,
          data: review,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof DuplicateReviewError || err instanceof ProfessorInactiveError) {
          return reply.status(409).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 6. Edit Student Review (24-hour window)
  app.put(
    '/api/v1/professors/:slug/reviews/:reviewId',
    async (request: FastifyRequest<{ Params: { slug: string; reviewId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const bodyResult = ReviewEditSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        const updated = await useCases.editReview.execute({
          reviewId: request.params.reviewId,
          authorUserId: identity.userId,
          collegeId: tenantContext.collegeId,
          newReviewText: bodyResult.data.newReviewText,
          newOverallRating: bodyResult.data.newOverallRating
        });

        return reply.send({
          success: true,
          data: updated,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EditWindowExpiredError || err instanceof UnauthorizedReviewError) {
          return reply.status(403).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 7. Vote Helpful/Unhelpful on Review
  app.post(
    '/api/v1/professors/:slug/reviews/:reviewId/votes',
    async (request: FastifyRequest<{ Params: { slug: string; reviewId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const bodyResult = VoteSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        await useCases.voteHelpful.execute({
          reviewId: request.params.reviewId,
          voterUserId: identity.userId,
          collegeId: tenantContext.collegeId,
          voteType: bodyResult.data.voteType
        });

        return reply.send({
          success: true,
          data: { status: 'VOTE_RECORDED' },
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof DuplicateVoteError) {
          return reply.status(409).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 8. Report Student Review
  app.post(
    '/api/v1/professors/:slug/reviews/:reviewId/reports',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Params: { slug: string; reviewId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const bodyResult = ReportSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        await useCases.reportReview.execute({
          reviewId: request.params.reviewId,
          reporterUserId: identity.userId,
          collegeId: tenantContext.collegeId,
          reason: bodyResult.data.reason,
          ...(bodyResult.data.details !== undefined ? { _details: bodyResult.data.details } : {})
        });

        return reply.send({
          success: true,
          data: { status: 'REPORT_RECORDED' },
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof DuplicateReportError) {
          return reply.status(409).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 9. Post Verified Faculty Counter-Response
  app.post(
    '/api/v1/professors/:slug/reviews/:reviewId/response',
    async (request: FastifyRequest<{ Params: { slug: string; reviewId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const bodyResult = FacultyResponseSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        const result = await useCases.addFacultyResponse.execute({
          reviewId: request.params.reviewId,
          professorUserId: identity.userId,
          collegeId: tenantContext.collegeId,
          responseText: bodyResult.data.responseText
        });

        return reply.status(201).send({
          success: true,
          data: result,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 10. Delete Student Review (24-hour window)
  app.delete(
    '/api/v1/professors/:slug/reviews/:reviewId',
    async (request: FastifyRequest<{ Params: { slug: string; reviewId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      try {
        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        if (useCases.deleteReview) {
          await useCases.deleteReview.execute({
            reviewId: request.params.reviewId,
            authorUserId: identity.userId,
            collegeId: tenantContext.collegeId
          });
        }

        return reply.send({
          success: true,
          data: { status: 'REVIEW_DELETED' },
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EditWindowExpiredError || err instanceof UnauthorizedReviewError) {
          return reply.status(403).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 11. Remove Vote on Review
  app.delete(
    '/api/v1/professors/:slug/reviews/:reviewId/votes',
    async (request: FastifyRequest<{ Params: { slug: string; reviewId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      try {
        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        if (useCases.removeVote) {
          await useCases.removeVote.execute({
            reviewId: request.params.reviewId,
            voterUserId: identity.userId,
            collegeId: tenantContext.collegeId
          });
        }

        return reply.send({
          success: true,
          data: { status: 'VOTE_REMOVED' },
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 12. Update Verified Faculty Counter-Response
  app.put(
    '/api/v1/professors/:slug/faculty-response/:responseId',
    async (request: FastifyRequest<{ Params: { slug: string; responseId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const bodyResult = FacultyResponseSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const identity = resolveIdentity(request);
        if ('error' in identity) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
          });
        }

        let result = { responseId: request.params.responseId };
        if (useCases.updateFacultyResponse) {
          result = await useCases.updateFacultyResponse.execute({
            responseId: request.params.responseId,
            professorUserId: identity.userId,
            collegeId: tenantContext.collegeId,
            responseText: bodyResult.data.responseText
          });
        }

        return reply.send({
          success: true,
          data: result,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 13. Review Moderation Queue (ADMIN / MODERATOR only — blind identity)
  app.get('/api/v1/professors/moderation/queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
    const identity = resolveIdentity(request);

    if ('error' in identity) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
      });
    }

    if (!isModerator(identity as any)) {
      return denyModeration(reply);
    }

    if (!useCases.getModerationQueue) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Moderation queue is not available on this server.' }
      });
    }

    const queue = await useCases.getModerationQueue.execute({ collegeId: tenantContext.collegeId });

    // Blind moderation — strip all author identity fields before returning.
    const blindQueue = queue.map((r) => ({
      ...r,
      authorUserId: 'BLIND',
      authorAnonymousToken: 'BLIND'
    }));

    return reply.send({
      success: true,
      data: blindQueue,
      meta: {
        requestId: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  });

  // 14. Review Moderation Decision (ADMIN / MODERATOR only)
  app.post(
    '/api/v1/professors/moderation/reviews/:reviewId/decision',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Params: { reviewId: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const identity = resolveIdentity(request);

      if ('error' in identity) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
        });
      }

      if (!isModerator(identity as any)) {
        return denyModeration(reply);
      }

      if (!useCases.moderateReview) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Moderation decisions are not available on this server.' }
        });
      }

      const bodyResult = ReviewModerationDecisionSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const result = await useCases.moderateReview.execute({
          reviewId: request.params.reviewId,
          collegeId: tenantContext.collegeId,
          moderatorUserId: identity.userId,
          action: bodyResult.data.action,
          ...(bodyResult.data.reasonNote !== undefined ? { reasonNote: bodyResult.data.reasonNote } : {})
        });

        return reply.send({
          success: true,
          data: {
            reviewId: result.id,
            moderationStatus: result.moderationStatus,
            action: bodyResult.data.action
          },
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: err.code, message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 15. Admin — List Departments (ADMIN / MODERATOR only)
  app.get('/api/v1/admin/departments', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
    const identity = resolveIdentity(request);

    if ('error' in identity) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
      });
    }

    if (!isModerator(identity as any)) {
      return denyModeration(reply);
    }

    if (!useCases.listDepartments) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Departments are not available on this server.' }
      });
    }

    const departments = await useCases.listDepartments.execute({ collegeId: tenantContext.collegeId });
    return reply.send({
      success: true,
      data: departments,
      meta: {
        requestId: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  });

  // 16. Admin — List Professors (ADMIN / MODERATOR only; includes non-ACTIVE)
  app.get('/api/v1/admin/professors', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
    const identity = resolveIdentity(request);

    if ('error' in identity) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
      });
    }

    if (!isModerator(identity as any)) {
      return denyModeration(reply);
    }

    const queryResult = AdminListProfessorsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_QUERY_PARAMS', message: queryResult.error.message }
      });
    }

    const professors = await useCases.searchProfessors.execute({
      collegeId: tenantContext.collegeId,
      ...(queryResult.data.query !== undefined ? { query: queryResult.data.query } : {}),
      ...(queryResult.data.departmentId !== undefined ? { departmentId: queryResult.data.departmentId } : {})
    });

    return reply.send({
      success: true,
      data: professors,
      meta: {
        requestId: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  });

  // 17. Admin — Create Professor (ADMIN / MODERATOR only)
  app.post(
    '/api/v1/admin/professors',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const identity = resolveIdentity(request);

      if ('error' in identity) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
        });
      }

      if (!isModerator(identity as any)) {
        return denyModeration(reply);
      }

      if (!useCases.adminCreateProfessor) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Professor management is not available on this server.' }
        });
      }

      const bodyResult = AdminCreateProfessorSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const professor = await useCases.adminCreateProfessor.execute({
          collegeId: tenantContext.collegeId,
          departmentId: bodyResult.data.departmentId,
          fullName: bodyResult.data.fullName,
          slug: bodyResult.data.slug,
          designation: bodyResult.data.designation,
          ...(bodyResult.data.biography !== undefined ? { biography: bodyResult.data.biography } : {}),
          ...(bodyResult.data.officialEmail !== undefined ? { officialEmail: bodyResult.data.officialEmail } : {})
        });

        return reply.status(201).send({
          success: true,
          data: professor,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(409).send({
            success: false,
            error: { code: 'DUPLICATE_SLUG', message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 18. Admin — Update Professor (ADMIN / MODERATOR only)
  app.patch(
    '/api/v1/admin/professors/:id',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const identity = resolveIdentity(request);

      if ('error' in identity) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
        });
      }

      if (!isModerator(identity as any)) {
        return denyModeration(reply);
      }

      if (!useCases.adminUpdateProfessor) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Professor management is not available on this server.' }
        });
      }

      const bodyResult = AdminUpdateProfessorSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: bodyResult.error.message }
        });
      }

      try {
        const professor = await useCases.adminUpdateProfessor.execute({
          id: request.params.id,
          collegeId: tenantContext.collegeId,
          ...(bodyResult.data.departmentId !== undefined ? { departmentId: bodyResult.data.departmentId } : {}),
          ...(bodyResult.data.fullName !== undefined ? { fullName: bodyResult.data.fullName } : {}),
          ...(bodyResult.data.slug !== undefined ? { slug: bodyResult.data.slug } : {}),
          ...(bodyResult.data.designation !== undefined ? { designation: bodyResult.data.designation } : {}),
          ...(bodyResult.data.status !== undefined ? { status: bodyResult.data.status } : {}),
          ...(bodyResult.data.biography !== undefined ? { biography: bodyResult.data.biography } : {}),
          ...(bodyResult.data.officialEmail !== undefined ? { officialEmail: bodyResult.data.officialEmail } : {})
        });

        return reply.send({
          success: true,
          data: professor,
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: 'ENTITY_NOT_FOUND', message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );

  // 19. Admin — Delete Professor (soft delete; ADMIN / MODERATOR only)
  app.delete(
    '/api/v1/admin/professors/:id',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantContext: TenantContext = (request as any).tenantContext || { collegeId: 'default-college' };
      const identity = resolveIdentity(request);

      if ('error' in identity) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_JWT', message: identity.error, requestId: request.headers['x-request-id'] }
        });
      }

      if (!isModerator(identity as any)) {
        return denyModeration(reply);
      }

      if (!useCases.adminDeleteProfessor) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Professor management is not available on this server.' }
        });
      }

      try {
        await useCases.adminDeleteProfessor.execute({
          id: request.params.id,
          collegeId: tenantContext.collegeId
        });

        return reply.send({
          success: true,
          data: { id: request.params.id, status: 'DELETED' },
          meta: {
            requestId: request.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err: any) {
        if (err instanceof EntityNotFoundError) {
          return reply.status(404).send({
            success: false,
            error: { code: 'ENTITY_NOT_FOUND', message: err.message, requestId: request.headers['x-request-id'] }
          });
        }
        throw err;
      }
    }
  );
}
