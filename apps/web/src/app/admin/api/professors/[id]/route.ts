import { NextRequest, NextResponse } from 'next/server';
import { isSessionValid, ADMIN_COOKIE_NAME } from '@web/lib/admin-auth';
import { signAdminApiToken, getAdminApiJwtSecret, ADMIN_API_COLLEGE_ID } from '@web/lib/api-admin-token';

export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function withAdminToken(req: NextRequest): Promise<{ token: string } | NextResponse> {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await isSessionValid(cookie))) {
    return NextResponse.json({ success: false, error: { code: 'ADMIN_AUTH_REQUIRED' } }, { status: 401 });
  }
  try {
    return { token: signAdminApiToken(getAdminApiJwtSecret()) };
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'ADMIN_TOKEN_CONFIG', message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAdminToken(req);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST' } }, { status: 400 });
  }

  const { id } = await params;

  const res = await fetch(`${API_BASE}/api/v1/admin/professors/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
      'x-college-id': ADMIN_API_COLLEGE_ID
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { success: false }, { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAdminToken(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const res = await fetch(`${API_BASE}/api/v1/admin/professors/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
      'x-college-id': ADMIN_API_COLLEGE_ID
    },
    cache: 'no-store'
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { success: false }, { status: res.status });
}
