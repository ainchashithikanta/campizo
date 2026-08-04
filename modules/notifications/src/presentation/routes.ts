/**
 * Unified Notification Engine — Fastify Route Plugin (MS-40 Production)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotificationController } from './controller.js';
import { NotificationUseCases } from '../application/use-cases.js';
import { InMemoryNotificationRepository } from '../infrastructure/repositories/in-memory-notification.repository.js';
import { GenericEventPublisher } from '../infrastructure/publishers/generic-event-publisher.js';

export async function notificationRoutesPlugin(
  fastify: FastifyInstance,
  options?: { useCases?: NotificationUseCases }
) {
  const repo = new InMemoryNotificationRepository();
  const publisher = new GenericEventPublisher(repo);
  const useCases = options?.useCases || new NotificationUseCases(repo, publisher);
  const controller = new NotificationController(useCases);

  fastify.get('/notifications', (req: FastifyRequest, reply: FastifyReply) => controller.listNotifications(req, reply));
  fastify.get('/notifications/unread-count', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getUnreadCount(req, reply)
  );
  fastify.patch('/notifications/:id/read', (req: FastifyRequest, reply: FastifyReply) =>
    controller.markAsRead(req, reply)
  );
  fastify.patch('/notifications/read-all', (req: FastifyRequest, reply: FastifyReply) =>
    controller.markAllAsRead(req, reply)
  );
  fastify.delete('/notifications/:id', (req: FastifyRequest, reply: FastifyReply) =>
    controller.deleteNotification(req, reply)
  );

  fastify.get('/notifications/preferences', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getPreferences(req, reply)
  );
  fastify.patch('/notifications/preferences', (req: FastifyRequest, reply: FastifyReply) =>
    controller.updatePreferences(req, reply)
  );

  fastify.get('/notifications/categories', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getCategories(req, reply)
  );
  fastify.get('/notifications/rules', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getUserRules(req, reply)
  );
  fastify.patch('/notifications/rules', (req: FastifyRequest, reply: FastifyReply) =>
    controller.updateUserRules(req, reply)
  );
  fastify.get('/notifications/digests', (req: FastifyRequest, reply: FastifyReply) =>
    controller.getDigests(req, reply)
  );
  fastify.post('/notifications/digests/generate', (req: FastifyRequest, reply: FastifyReply) =>
    controller.generateDigest(req, reply)
  );
  fastify.get('/notifications/queue', (req: FastifyRequest, reply: FastifyReply) => controller.getQueue(req, reply));

  fastify.post('/notifications/publish', (req: FastifyRequest, reply: FastifyReply) =>
    controller.publishNotification(req, reply)
  );
}
