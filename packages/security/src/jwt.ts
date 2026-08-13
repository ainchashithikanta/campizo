import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtClaims {
  sub: string;
  collegeId: string;
  roles: string[];
  displayName?: string;
  iat: number;
  exp: number;
}

export interface JwtSignOptions {
  ttlSeconds?: number;
}

const DEFAULT_TTL_SECONDS = 15 * 60;

function b64urlEncode(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

function b64urlDecode(data: string): Buffer {
  return Buffer.from(data, 'base64url');
}

function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is missing or shorter than 32 characters. Refusing to sign tokens.'
    );
  }
  return secret;
}

export function signJwt(claims: Omit<JwtClaims, 'iat' | 'exp'>, secret?: string, options: JwtSignOptions = {}): string {
  const resolvedSecret = secret ?? getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  const payload: JwtClaims = {
    ...claims,
    iat: now,
    exp: now + ttl
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = b64urlEncode(JSON.stringify(header));
  const payloadPart = b64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = createHmac('sha256', resolvedSecret).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
}

export function verifyJwt(token: string, secret?: string): JwtClaims | null {
  const resolvedSecret = secret ?? getJwtSecret();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  if (headerPart === undefined || payloadPart === undefined || signaturePart === undefined) return null;

  const expectedSignature = createHmac('sha256', resolvedSecret)
    .update(`${headerPart}.${payloadPart}`)
    .digest('base64url');

  if (!constantTimeEqual(Buffer.from(signaturePart), Buffer.from(expectedSignature))) return null;

  let header: { alg?: string; typ?: string };
  let payload: JwtClaims;
  try {
    header = JSON.parse(b64urlDecode(headerPart).toString('utf8'));
    payload = JSON.parse(b64urlDecode(payloadPart).toString('utf8'));
  } catch {
    return null;
  }

  if (header.alg !== 'HS256') return null;

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
  if (typeof payload.collegeId !== 'string' || payload.collegeId.length === 0) return null;
  if (!Array.isArray(payload.roles) || payload.roles.some((r) => typeof r !== 'string')) return null;
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null;

  const now = Math.floor(Date.now() / 1000);
  if (now < payload.iat - 30) return null;
  if (now >= payload.exp) return null;

  return payload;
}

export function createAdminApiJwt(secret?: string): string {
  return signJwt(
    {
      sub: 'admin-console',
      collegeId: '*',
      roles: ['ADMIN', 'MODERATOR', 'SUPER_ADMIN']
    },
    secret,
    { ttlSeconds: 12 * 60 * 60 }
  );
}

export { getJwtSecret };
