import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UploadSessionCreateSchema } from '../validators/academic-resource.validators.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export function registerUploadRoutes(app: FastifyInstance): void {
  // 1. Create Pre-Signed Upload Session
  app.post('/api/v1/uploads/session', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = UploadSessionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: parsed.error.message }
      });
    }

    try {
      const uploadId = `upl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      return reply.status(201).send({
        success: true,
        data: {
          uploadId,
          preSignedUploadUrl: `https://storage.collegehub.edu/pre-signed/upload-${uploadId}.pdf`,
          storageKey: `s3/uploads/${uploadId}.pdf`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        },
        meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
      });
    } catch (err: any) {
      return handleHttpError(err, request, reply);
    }
  });

  // 2. Get Upload Status
  app.get('/api/v1/uploads/:uploadId/status', async (request: FastifyRequest<{ Params: { uploadId: string } }>, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: { uploadId: request.params.uploadId, status: 'CLEAN', virusScanStatus: 'CLEAN' },
      meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
    });
  });

  // 3. Delete / Cancel Upload Session
  app.delete('/api/v1/uploads/:uploadId', async (request: FastifyRequest<{ Params: { uploadId: string } }>, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: { status: 'UPLOAD_CANCELLED' },
      meta: { requestId: request.headers['x-request-id'] || 'unknown', timestamp: new Date().toISOString() }
    });
  });
}
