import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const password = process.env.COWORK_PASSWORD;
  // No password set → open access
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Always allow login routes and health check
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  const session = request.cookies.get('cowork_session');
  if (session?.value === password) return NextResponse.next();

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
