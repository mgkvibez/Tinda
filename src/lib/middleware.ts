/**
 * NOTE: This file should ideally be at the root of the project (./middleware.ts) 
 * per Next.js conventions, but we are keeping it here as per current project structure.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('__session')?.value;

  // Redirect to login if accessing dashboard without a session
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if logged in and accessing auth pages
  if (session && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
  ],
};