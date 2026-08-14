import { createHmac } from 'node:crypto';

/**
 * Signs a short-lived admin JWT for the Fastify API using the same
 * HS256 format as packages/security. Server-side only — never exposed
 * to the browser.
 */
function b64url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

export function getAdminApiJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is missing for the admin API bridge. Set JWT_SECRET on the web app.'
    );
  }
  return secret;
}

export function signAdminApiToken(secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: 'admin-console',
    collegeId: '*',
    roles: ['ADMIN', 'MODERATOR', 'SUPER_ADMIN'],
    iat: now,
    exp: now + 12 * 60 * 60
  };

  const headerPart = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadPart = b64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest('base64url');

  return `${headerPart}.${payloadPart}.${signature}`;
}

export const ADMIN_API_COLLEGE_ID = process.env.ADMIN_COLLEGE_ID || 'college-nitk-003';
