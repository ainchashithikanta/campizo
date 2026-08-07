import { NextRequest, NextResponse } from 'next/server';
import { isPinValid, buildSessionToken, ADMIN_COOKIE_NAME } from '@web/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!body.pin || !isPinValid(body.pin)) {
    return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
  }

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
