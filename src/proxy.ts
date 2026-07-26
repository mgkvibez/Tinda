import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Lightweight middleware — runs on the Edge runtime.
 * Only checks for the presence of a __session cookie.
 * Full Firebase ID token verification happens in API route handlers
 * (which run in the Node.js runtime) via the auth() function.
 */
export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value

  const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup'
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/candidate') ||
    request.nextUrl.pathname.startsWith('/employer') ||
    request.nextUrl.pathname.startsWith('/chat') ||
    request.nextUrl.pathname.startsWith('/notifications') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/interviews') ||
    request.nextUrl.pathname.startsWith('/assessment') ||
    request.nextUrl.pathname.startsWith('/offers')

  // Public routes — company pages and manifest
  const isPublic = request.nextUrl.pathname.startsWith('/company') ||
    request.nextUrl.pathname === '/manifest.json'

  if (isPublic) {
    return NextResponse.next()
  }

  if (!sessionCookie && isProtected) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (sessionCookie && isAuthPage) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/candidate/:path*',
    '/employer/:path*',
    '/chat/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/interviews/:path*',
    '/assessment/:path*',
    '/offers/:path*',
    '/company/:path*',
    '/login',
    '/signup',
  ],
}
