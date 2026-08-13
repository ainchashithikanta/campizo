import { verifyJwt } from './jwt.js';

export interface ApiIdentity {
  userId: string;
  collegeId: string | null;
  roles: string[];
  displayName?: string;
  isAuthenticated: boolean;
}

export type IdentityResolution =
  | { status: 'ok'; identity: ApiIdentity }
  | { status: 'invalid_token'; message: string }
  | { status: 'config_error'; message: string };

export interface IncomingAuthContext {
  authorizationHeader?: string | undefined;
  collegeIdHeader?: string | undefined;
  userIdHeader?: string | undefined;
}

export const MODERATION_ROLES = ['MODERATOR', 'ADMIN', 'COLLEGE_ADMIN', 'SUPER_ADMIN'];

/**
 * Resolves the request identity WITHOUT trusting client-supplied headers.
 *
 * Security model:
 * - A valid `Authorization: Bearer <JWT>` is the ONLY source of truth for
 *   userId, collegeId, and roles. Header claims (x-user-id / x-user-role)
 *   are never honored for authenticated requests.
 * - Without a token, the request is treated as an unauthenticated guest.
 *   `x-user-id` may be supplied for anonymous, low-trust interactions
 *   (voting, bookmarking, posting) but grants NO elevated roles.
 * - Any Authorization header that fails cryptographic verification is
 *   rejected outright (401) instead of being silently downgraded.
 */
export function resolveApiIdentity(ctx: IncomingAuthContext): IdentityResolution {
  const authHeader = ctx.authorizationHeader;

  if (authHeader !== undefined && authHeader.trim().length > 0) {
    if (!authHeader.startsWith('Bearer ')) {
      return { status: 'invalid_token', message: 'Authorization header must use the Bearer scheme.' };
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (token.length === 0) {
      return { status: 'invalid_token', message: 'Authorization header contains an empty token.' };
    }

    let claims;
    try {
      claims = verifyJwt(token);
    } catch (err) {
      return {
        status: 'config_error',
        message: err instanceof Error ? err.message : 'JWT verification is unavailable.'
      };
    }

    if (!claims) {
      return { status: 'invalid_token', message: 'Token signature verification failed or token has expired.' };
    }

    const identity: ApiIdentity = {
      userId: claims.sub,
      collegeId: claims.collegeId,
      roles: claims.roles,
      isAuthenticated: true,
      ...(claims.displayName !== undefined ? { displayName: claims.displayName } : {})
    };

    return { status: 'ok', identity };
  }

  // Unauthenticated guest mode — roles are NEVER derived from headers.
  const userId = (ctx.userIdHeader || 'anonymous').trim();
  const collegeId = ctx.collegeIdHeader || null;

  return {
    status: 'ok',
    identity: {
      userId: userId.length > 0 ? userId : 'anonymous',
      collegeId,
      roles: ['GUEST'],
      isAuthenticated: false
    }
  };
}

export function isModerator(identity: ApiIdentity): boolean {
  return identity.isAuthenticated && identity.roles.some((r) => MODERATION_ROLES.includes(r));
}
