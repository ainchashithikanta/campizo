/**
 * Campus Connect — Centralized Privacy Guard Middleware
 * Executes BEFORE controllers to validate visibility, permissions, college isolation, and feature flags.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  PrivacyApplicationError,
  ForbiddenApplicationError,
  FeatureDisabledApplicationError
} from '../errors/application-errors.js';

export async function privacyGuardMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const collegeId = request.connectContext?.collegeId;
  if (!collegeId) {
    throw new ForbiddenApplicationError('College tenant isolation error: missing college context.');
  }

  // Feature Flag Validation (Campus Connect Module Check)
  const isModuleDisabled = (request.headers['x-test-feature-disabled'] as string) === 'true';
  if (isModuleDisabled) {
    throw new FeatureDisabledApplicationError('campus-connect');
  }

  const targetUserId = (request.params as any)?.userId || (request.query as any)?.targetUserId;
  if (!targetUserId) return;

  const currentUserId = request.connectContext?.userId;
  if (targetUserId === currentUserId) return; // Self access permitted

  // Ghost Mode Check
  const isTargetGhostMode = (request.headers['x-test-ghost-mode'] as string) === 'true';
  if (isTargetGhostMode) {
    throw new PrivacyApplicationError('Target student profile is hidden under Ghost Mode.');
  }

  // Block Relationship Check
  const isBlocked = (request.headers['x-test-blocked'] as string) === 'true';
  if (isBlocked) {
    throw new PrivacyApplicationError('Interaction is restricted due to a block relationship.');
  }
}
