import type { FastifyRequest, FastifyReply } from 'fastify';

export class UploadController {
  async createUploadSession(req: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    const { collegeId, requestId } = req.ctx;

    reply.status(200);
    return {
      success: true,
      data: {
        uploadId: `up-${Date.now()}`,
        status: 'READY_FOR_FUTURE_MEDIA',
        presignedUrl: 'https://storage.collegehub.edu/media-placeholder'
      },
      metadata: { requestId, collegeId, timestamp: new Date().toISOString() }
    };
  }
}
