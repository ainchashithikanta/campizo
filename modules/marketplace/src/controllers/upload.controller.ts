import { FastifyRequest, FastifyReply } from 'fastify';
import { UploadSessionSchema } from '../validators/marketplace.validators.js';
import { handleHttpError } from '../errors/http-error-handler.js';

export type UploadLifecycleStatus =
  'CREATED' | 'UPLOADING' | 'UPLOADED' | 'SCANNING' | 'OPTIMIZING' | 'READY' | 'FAILED' | 'CANCELLED';

export class UploadController {
  async createUploadSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = UploadSessionSchema.parse(request.body);
      const uploadId = `upl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const preSignedUrl = `https://storage.collegehub.edu.in/upload/${uploadId}/${body.fileName}`;

      return reply.status(201).send({
        success: true,
        data: {
          uploadId,
          fileName: body.fileName,
          preSignedUrl,
          expiresInSeconds: 900,
          status: 'CREATED' as UploadLifecycleStatus
        }
      });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }

  async getUploadStatus(request: FastifyRequest<{ Params: { uploadId: string } }>, reply: FastifyReply) {
    try {
      return reply.status(200).send({
        success: true,
        data: {
          uploadId: request.params.uploadId,
          status: 'READY' as UploadLifecycleStatus,
          virusScanStatus: 'CLEAN',
          isProcessed: true
        }
      });
    } catch (err) {
      handleHttpError(err, request, reply);
    }
  }
}
