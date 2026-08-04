import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConfessionUseCases } from '../use-cases/confession.use-cases.js';
import { ConfessionQueries } from '../queries/confession.queries.js';
import { FeedController } from '../controllers/feed.controller.js';
import { ConfessionController } from '../controllers/confession.controller.js';
import { CommentController } from '../controllers/comment.controller.js';
import { ModerationController } from '../controllers/moderation.controller.js';
import { BookmarkController } from '../controllers/bookmark.controller.js';
import { NotificationController } from '../controllers/notification.controller.js';
import { UploadController } from '../controllers/upload.controller.js';
import { handleConfessionHttpError } from '../errors/http-error-handler.js';
import { registerRequestContext } from '../middleware/request-context.js';
import { IdempotencyStore, registerIdempotency } from '../middleware/idempotency.js';
import { registerRequestLogger } from '../middleware/request-logger.js';

export interface ConfessionRoutesOptions {
  useCases: ConfessionUseCases;
  queries: ConfessionQueries;
  idempotencyStore?: IdempotencyStore;
}

/**
 * Versioned plugin wrapper.
 * All routes are mounted under /api/v1/confessions/...
 * To introduce /api/v2 later, register a second plugin without reorganizing the module.
 */
export async function confessionRoutes(fastify: FastifyInstance, opts: ConfessionRoutesOptions): Promise<void> {
  // ── Middleware pipeline: Tenant → Auth → Idempotency → Logger ──────
  registerRequestContext(fastify);

  const idempotencyStore = opts.idempotencyStore || new IdempotencyStore();
  registerIdempotency(fastify, idempotencyStore);

  registerRequestLogger(fastify);

  // ── Error handler ──────────────────────────────────────────────────
  fastify.setErrorHandler((error: Error, req: FastifyRequest, reply: FastifyReply) => {
    handleConfessionHttpError(error, req, reply);
  });

  // ── Controller instantiation ───────────────────────────────────────
  const feedCtrl = new FeedController(opts.queries);
  const confCtrl = new ConfessionController(opts.useCases, opts.queries);
  const commentCtrl = new CommentController(opts.useCases);
  const modCtrl = new ModerationController(opts.useCases, opts.queries);
  const bookmarkCtrl = new BookmarkController(opts.queries);
  const notifCtrl = new NotificationController();
  const uploadCtrl = new UploadController();

  // ── Feed Endpoints ─────────────────────────────────────────────────
  fastify.get('/api/v1/confessions/feed', async (req: FastifyRequest, reply: FastifyReply) => {
    return feedCtrl.getFeed(req, reply);
  });
  fastify.get('/api/v1/confessions/search', async (req: FastifyRequest, reply: FastifyReply) => {
    return feedCtrl.searchConfessions(req, reply);
  });
  fastify.get('/api/v1/confessions/categories', async (req: FastifyRequest, reply: FastifyReply) => {
    return feedCtrl.getCategories(req, reply);
  });

  // ── Confession Endpoints ───────────────────────────────────────────
  fastify.post('/api/v1/confessions', async (req: FastifyRequest, reply: FastifyReply) => {
    return confCtrl.createConfession(req, reply);
  });
  fastify.get<{ Params: { id: string } }>('/api/v1/confessions/:id', async (req, reply) => {
    return confCtrl.getConfessionDetail(req, reply);
  });
  fastify.post<{ Params: { id: string } }>('/api/v1/confessions/:id/vote', async (req, reply) => {
    return confCtrl.voteConfession(req, reply);
  });
  fastify.post<{ Params: { id: string } }>('/api/v1/confessions/:id/bookmark', async (req, reply) => {
    return confCtrl.bookmarkConfession(req, reply);
  });
  fastify.post<{ Params: { id: string } }>('/api/v1/confessions/:id/report', async (req, reply) => {
    return confCtrl.reportConfession(req, reply);
  });

  // ── Comment Endpoints ──────────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/api/v1/confessions/:id/comments', async (req, reply) => {
    return commentCtrl.createComment(req, reply);
  });
  fastify.post<{ Params: { commentId: string } }>('/api/v1/comments/:commentId/soft-delete', async (req, reply) => {
    return commentCtrl.softDeleteComment(req, reply);
  });

  // ── Moderation Endpoints ───────────────────────────────────────────
  fastify.get('/api/v1/confessions/moderation/queue', async (req: FastifyRequest, reply: FastifyReply) => {
    return modCtrl.getQueue(req, reply);
  });
  fastify.post<{ Params: { caseId: string } }>(
    '/api/v1/confessions/moderation/:caseId/decision',
    async (req, reply) => {
      return modCtrl.recordDecision(req, reply);
    }
  );

  // ── Bookmarks, Notifications & Uploads ─────────────────────────────
  fastify.get('/api/v1/confessions/feed/saved', async (req: FastifyRequest, reply: FastifyReply) => {
    return bookmarkCtrl.getBookmarks(req, reply);
  });
  fastify.get('/api/v1/confessions/notifications', async (req: FastifyRequest, reply: FastifyReply) => {
    return notifCtrl.getNotifications(req, reply);
  });
  fastify.post('/api/v1/confessions/uploads/session', async (req: FastifyRequest, reply: FastifyReply) => {
    return uploadCtrl.createUploadSession(req, reply);
  });
}
