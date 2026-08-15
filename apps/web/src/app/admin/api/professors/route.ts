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

export async function GET(req: NextRequest) {
  const auth = await withAdminToken(req);
  if (auth instanceof NextResponse) return auth;

  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('query');
  const departmentId = searchParams.get('departmentId');

  const url = new URL(`${API_BASE}/api/v1/admin/professors`);
  if (query) url.searchParams.set('query', query);
  if (departmentId) url.searchParams.set('departmentId', departmentId);

  const res = await fetch(url, {
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

export async function POST(req: NextRequest) {
  const auth = await withAdminToken(req);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST' } }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/professors`, {
    method: 'POST',
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