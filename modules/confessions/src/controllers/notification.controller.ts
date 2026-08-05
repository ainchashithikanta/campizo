import type { FastifyRequest, FastifyReply } from 'fastify';

export class NotificationController {
  async getNotifications(req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    const { collegeId, requestId } = req.ctx;

    const notifications = [
      {
        id: 'notif-1',
        notificationType: 'ReplyReceived',
        payloadJson: JSON.stringify({ threadPseudonym: 'Witty Owl #108', message: 'Replied to your confession' }),
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];

    reply.status(200);
    return {
      success: true,
      data: notifications,
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }
}
