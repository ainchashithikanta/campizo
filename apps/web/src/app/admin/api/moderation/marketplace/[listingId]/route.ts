import { NextRequest, NextResponse } from 'next/server';
import { isSessionValid, ADMIN_COOKIE_NAME } from '@web/lib/admin-auth';
import { signAdminApiToken, getAdminApiJwtSecret, ADMIN_API_COLLEGE_ID } from '@web/lib/api-admin-token';

export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await isSessionValid(cookie))) {
    return NextResponse.json({ success: false, error: { code: 'ADMIN_AUTH_REQUIRED' } }, { status: 401 });
  }

  let body: { action?: string; reasonNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST' } }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST' } }, { status: 400 });
  }

  let token: string;
  try {
    token = signAdminApiToken(getAdminApiJwtSecret());
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'ADMIN_TOKEN_CONFIG', message: (err as Error).message } },
      { status: 500 }
    );
  }

  const { listingId } = await params;

  const res = await fetch(`${API_BASE}/api/v1/marketplace/moderation/listings/${listingId}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-college-id': ADMIN_API_COLLEGE_ID
    },
    body: JSON.stringify({ action: body.action, reasonNote: body.reasonNote }),
    cache: 'no-store'
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { success: false }, { status: res.status });
}
