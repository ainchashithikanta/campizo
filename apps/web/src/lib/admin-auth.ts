const SECRET = process.env.ADMIN_SESSION_SECRET || 'campizo-admin-secret-2026';
const PIN = process.env.ADMIN_PIN || 'campizo-admin-2026';
const COOKIE_NAME = 'campizo_admin_session';
const SESSION_TTL_SECONDS = 24 * 60 * 60;

function toB64Url(input: Uint8Array): string {
  let binary = '';
  input.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(b64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signToken(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${toB64Url(new Uint8Array(signature))}`;
}

export async function verifyToken(token: string, payload: string): Promise<boolean> {
  try {
    const expected = await signToken(payload);
    const actualBytes = fromB64Url(token);
    const expectedBytes = fromB64Url(expected);
    if (actualBytes.length !== expectedBytes.length) return false;
    let diff = 0;
    for (let i = 0; i < actualBytes.length; i++) {
      diff |= actualBytes[i] ^ expectedBytes[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export function buildSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = `admin|${now}`;
  return signToken(payload).then((sig) => `v1.${toB64Url(new TextEncoder().encode(payload))}.${sig}`);
}

export async function isSessionValid(rawCookie: string | undefined | null): Promise<boolean> {
  if (!rawCookie) return false;
  const parts = rawCookie.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const payloadBytes = fromB64Url(parts[1]);
  const payload = new TextDecoder().decode(payloadBytes);
  const [role, issuedAtStr] = payload.split('|');
  if (role !== 'admin') return false;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (Number.isNaN(issuedAt)) return false;
  if (Date.now() / 1000 - issuedAt > SESSION_TTL_SECONDS) return false;
  return verifyToken(parts[2], payload);
}

export function isPinValid(pin: string): boolean {
  return pin === PIN;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_PIN = PIN;
