import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { TenantContext } from '@college-hub/types';
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
  EntityNotFoundError,
  DuplicateReviewError,
  EditWindowExpiredError,
  ProfessorInactiveError,
  DuplicateVoteError,
  DuplicateReportError
} from '../index.js';

// Input Zod Validation Schemas
export const SearchQuerySchema = z.object({
  query: z.string().optional(),
  dept: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20)
});

export const ReviewCreateSchema = z.object({
  courseAssignmentId: z.string().uuid(),
  reviewText: z.string().min(20).max(1000),
  overallRating: z.number().min(1.0).max(5.0),
  isAnonymous: z.boolean().optional().default(true),
  gradeReceived: z.string().optional()
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
  }
): void {
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

    return reply.send({
      success: true,
      data: professorsList,
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

        const authorUserId = (request.headers['x-user-id'] as string) || 'guest-user-101';
        const authorAnonymousToken = (request.headers['x-anon-token'] as string) || `anon-${authorUserId}`;

        const review = await useCases.submitReview.execute({
          collegeId: tenantContext.collegeId,
          professorId: profile.id,
          courseAssignmentId: bodyResult.data.courseAssignmentId,
          authorUserId,
          authorAnonymousToken,
          isAnonymous: bodyResult.data.isAnonymous,
          ...(bodyResult.data.gradeReceived !== undefined ? { gradeReceived: bodyResult.data.gradeReceived } : {}),
          reviewText: bodyResult.data.reviewText,
          overallRating: bodyResult.data.overallRating
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
        const authorUserId = (request.headers['x-user-id'] as string) || 'guest-user-101';

        const updated = await useCases.editReview.execute({
          reviewId: request.params.reviewId,
          authorUserId,
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
        if (err instanceof EditWindowExpiredError) {
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
        const voterUserId = (request.headers['x-user-id'] as string) || 'guest-voter-101';

        await useCases.voteHelpful.execute({
          reviewId: request.params.reviewId,
          voterUserId,
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
        const reporterUserId = (request.headers['x-user-id'] as string) || 'guest-reporter-101';

        await useCases.reportReview.execute({
          reviewId: request.params.reviewId,
          reporterUserId,
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
        const professorUserId = (request.headers['x-user-id'] as string) || 'prof-user-101';

        const result = await useCases.addFacultyResponse.execute({
          reviewId: request.params.reviewId,
          professorUserId,
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
        const authorUserId = (request.headers['x-user-id'] as string) || 'guest-user-101';

        if (useCases.deleteReview) {
          await useCases.deleteReview.execute({
            reviewId: request.params.reviewId,
            authorUserId,
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
        if (err instanceof EditWindowExpiredError) {
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
        const voterUserId = (request.headers['x-user-id'] as string) || 'guest-voter-101';

        if (useCases.removeVote) {
          await useCases.removeVote.execute({
            reviewId: request.params.reviewId,
            voterUserId,
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
        const professorUserId = (request.headers['x-user-id'] as string) || 'prof-user-101';

        let result = { responseId: request.params.responseId };
        if (useCases.updateFacultyResponse) {
          result = await useCases.updateFacultyResponse.execute({
            responseId: request.params.responseId,
            professorUserId,
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
}
