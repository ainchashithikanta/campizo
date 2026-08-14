import { NextRequest, NextResponse } from 'next/server';
import { isPinValid, buildSessionToken, ADMIN_COOKIE_NAME, isAdminAuthConfigured } from '@web/lib/admin-auth';

export const runtime = 'nodejs';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Attempt = { count: number; firstAt: number };
const attempts = new Map<string, Attempt>();

function getClientKey(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return ip;
}

function isLockedOut(key: string): boolean {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (Date.now() - attempt.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const attempt = attempts.get(key);
  if (!attempt || now - attempt.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  attempt.count += 1;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Admin console is not configured. Contact the administrator.' },
      { status: 503 }
    );
  }

  const clientKey = getClientKey(req);
  if (isLockedOut(clientKey)) {
    return NextResponse.json(
      { ok: false, error: 'Too many failed attempts. Try again later.' },
      { status: 429 }
    );
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  if (typeof body.pin !== 'string' || !isPinValid(body.pin)) {
    recordFailure(clientKey);
    return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
  }

  attempts.delete(clientKey);
  const token = await buildSessionToken();

  const res = NextResponse.json({ ok: true });

  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24
  });

  return res;
}