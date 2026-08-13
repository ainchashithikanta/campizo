import { NextRequest, NextResponse } from 'next/server';
import { isSessionValid, ADMIN_COOKIE_NAME } from './lib/admin-auth';

const ADMIN_PATHS = ['/admin'];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAdminPath) {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/api/')) {
      return NextResponse.next();
    }

    const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const valid = await isSessionValid(cookie);

    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
