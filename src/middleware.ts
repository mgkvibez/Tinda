import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth(request as any)

  const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup'
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/candidate') ||
    request.nextUrl.pathname.startsWith('/employer') ||
    request.nextUrl.pathname.startsWith('/chat') ||
    request.nextUrl.pathname.startsWith('/notifications') ||
    request.nextUrl.pathname.startsWith('/settings')

  // Public routes — company pages are public
  const isPublic = request.nextUrl.pathname.startsWith('/company')

  if (isPublic) {
    return NextResponse.next()
  }

  if (!session && isProtected) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (session && isAuthPage) {
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
    '/company/:path*',
    '/login',
    '/signup',
  ],
}
