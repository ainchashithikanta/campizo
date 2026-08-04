import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  DuplicateHashError,
  DuplicateResourceError,
  VersionConflictError,
  CollectionLimitExceededError,
  VirusScanRequiredError,
  SelfVoteError,
  PermissionDeniedError,
  ResourceNotFoundError,
  InvalidUploadError,
  StorageUnavailableError
} from './application-errors.js';
import {
  DomainValidationError,
  TenantMismatchError,
  SelfVoteProhibitedError
} from './domain-errors.js';

export function handleHttpError(err: Error, request: FastifyRequest, reply: FastifyReply) {
  const requestId = (request.headers['x-request-id'] as string) || 'unknown';

  if (err instanceof DuplicateHashError) {
    return reply.status(409).send({
      success: false,
      error: { code: 'DUPLICATE_FILE_HASH', message: err.message, requestId }
    });
  }

  if (err instanceof DuplicateResourceError) {
    return reply.status(409).send({
      success: false,
      error: { code: 'DUPLICATE_RESOURCE', message: err.message, requestId }
    });
  }

  if (err instanceof VersionConflictError) {
    return reply.status(409).send({
      success: false,
      error: { code: 'VERSION_CONFLICT', message: err.message, requestId }
    });
  }

  if (err instanceof CollectionLimitExceededError) {
    return reply.status(409).send({
      success: false,
      error: { code: 'COLLECTION_LIMIT_EXCEEDED', message: err.message, requestId }
    });
  }

  if (err instanceof VirusScanRequiredError) {
    return reply.status(409).send({
      success: false,
      error: { code: 'VIRUS_SCAN_REQUIRED', message: err.message, requestId }
    });
  }

  if (err instanceof SelfVoteError || err instanceof SelfVoteProhibitedError) {
    return reply.status(403).send({
      success: false,
      error: { code: 'SELF_VOTE_PROHIBITED', message: err.message, requestId }
    });
  }

  if (err instanceof PermissionDeniedError || err instanceof TenantMismatchError) {
    return reply.status(403).send({
      success: false,
      error: { code: 'PERMISSION_DENIED', message: err.message, requestId }
    });
  }

  if (err instanceof ResourceNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: err.message, requestId }
    });
  }

  if (err instanceof InvalidUploadError || err instanceof DomainValidationError) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_INPUT', message: err.message, requestId }
    });
  }

  if (err instanceof StorageUnavailableError) {
    return reply.status(503).send({
      success: false,
      error: { code: 'STORAGE_UNAVAILABLE', message: err.message, requestId }
    });
  }

  return reply.status(500).send({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'An unexpected error occurred.', requestId }
  });
}
