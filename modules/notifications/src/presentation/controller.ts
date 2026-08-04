/**
 * Unified Notification Engine — Fastify REST Controllers (MS-40 Production)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationUseCases } from '../application/use-cases.js';
import {
  PublishNotificationSchema,
  NotificationFilterQuerySchema,
  UpdatePreferencesSchema,
  UpdateRulesSchema,
  GenerateDigestSchema
} from './validators.js';

export class NotificationController {
  constructor(private readonly useCases: NotificationUseCases) {}

  async publishNotification(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const body = PublishNotificationSchema.parse(req.body);

    const result = await this.useCases.publishNotification({
      ...body,
      collegeId
    });

    reply.status(201).send({
      success: true,
      data: result,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async listNotifications(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';
    const query = NotificationFilterQuerySchema.parse(req.query);

    const result = await this.useCases.listNotifications({
      ...query,
      collegeId,
      recipientId
    });

    reply.status(200).send({
      success: true,
      data: result,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async getUnreadCount(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';

    const unreadCount = await this.useCases.getUnreadCount(recipientId, collegeId);

    reply.status(200).send({
      success: true,
      data: { unreadCount },
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async markAsRead(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';
    const { id } = req.params as { id: string };

    const result = await this.useCases.markAsRead(id, recipientId, collegeId);
    if (!result) {
      reply.status(404).send({
        success: false,
        error: { code: 'NOTIFICATION_NOT_FOUND', message: `Notification '${id}' not found` }
      });
      return;
    }

    reply.status(200).send({
      success: true,
      data: result,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async markAllAsRead(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';

    const count = await this.useCases.markAllAsRead(recipientId, collegeId);

    reply.status(200).send({
      success: true,
      data: { count },
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async deleteNotification(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';
    const { id } = req.params as { id: string };

    const deleted = await this.useCases.deleteNotification(id, recipientId, collegeId);
    reply.status(200).send({
      success: true,
      data: { deleted },
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async getPreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const userId = (req.headers['x-user-id'] as string) || 'usr_me';

    const prefs = await this.useCases.getPreferences(userId, collegeId);
    reply.status(200).send({
      success: true,
      data: prefs,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async updatePreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const userId = (req.headers['x-user-id'] as string) || 'usr_me';
    const body = UpdatePreferencesSchema.parse(req.body);

    const pref = await this.useCases.updatePreferences({
      ...body,
      userId,
      collegeId
    });

    reply.status(200).send({
      success: true,
      data: pref,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async getCategories(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const categories = this.useCases.getCategories();
    reply.status(200).send({
      success: true,
      data: categories
    });
  }

  async getUserRules(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const userId = (req.headers['x-user-id'] as string) || 'usr_me';

    const rules = await this.useCases.getUserRules(userId, collegeId);
    reply.status(200).send({
      success: true,
      data: rules,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async updateUserRules(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const userId = (req.headers['x-user-id'] as string) || 'usr_me';
    const body = UpdateRulesSchema.parse(req.body);

    const rules = await this.useCases.updateUserRules({
      ...body,
      userId,
      collegeId
    });

    reply.status(200).send({
      success: true,
      data: rules,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async getDigests(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';

    const digests = await this.useCases.getDigestJobs(recipientId, collegeId);
    reply.status(200).send({
      success: true,
      data: digests,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async generateDigest(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const collegeId = (req.headers['x-college-id'] as string) || 'college_stanford_001';
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';
    const body = GenerateDigestSchema.parse(req.body || {});

    const digest = await this.useCases.generateDigest(collegeId, recipientId, body.digestType);
    reply.status(201).send({
      success: true,
      data: digest,
      metadata: { timestamp: new Date().toISOString(), collegeId }
    });
  }

  async getQueue(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const recipientId = (req.headers['x-user-id'] as string) || 'usr_me';

    const queue = await this.useCases.getDeliveryQueue(recipientId);
    reply.status(200).send({
      success: true,
      data: queue
    });
  }
}
