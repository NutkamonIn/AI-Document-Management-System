import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const protectedPaths = ['/dashboard', '/documents', '/chat', '/settings', '/admin'];
const authPaths = ['/login', '/register'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // Redirect unauthenticated requests to login
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/documents/:path*',
    '/chat/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};