import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserType } from "@prisma/client";

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Redirect authenticated users from auth pages
    if (token && (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password"))) {
      const userType = token.userType as UserType;
      if (userType === UserType.Candidate) {
        return NextResponse.redirect(new URL("/candidate/dashboard", req.url));
      } else if (userType === UserType.Employer) {
        return NextResponse.redirect(new URL("/employer/dashboard", req.url));
      } else if (userType === UserType.Admin) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url)); // Default dashboard
    }

    // Protect specific routes based on user type
    if (pathname.startsWith("/candidate") && token?.userType !== UserType.Candidate) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }
    if (pathname.startsWith("/employer") && token?.userType !== UserType.Employer) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }
    if (pathname.startsWith("/admin") && token?.userType !== UserType.Admin) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }

    // If no specific redirection or protection, allow the request
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages, API routes, and static assets without authentication
        if (
          req.nextUrl.pathname.startsWith("/login") ||
          req.nextUrl.pathname.startsWith("/signup") ||
          req.nextUrl.pathname.startsWith("/forgot-password") ||
          req.nextUrl.pathname.startsWith("/verify-email") ||
          req.nextUrl.pathname.startsWith("/api/auth") ||
          req.nextUrl.pathname.startsWith("/_next/static") ||
          req.nextUrl.pathname.startsWith("/_next/image") ||
          req.nextUrl.pathname.startsWith("/favicon.ico") ||
          req.nextUrl.pathname === "/" // Allow root page
        ) {
          return true;
        }
        // Require authentication for all other routes
        return !!token;
      },
    },
    pages: {
      signIn: "/login", // Redirect unauthenticated users to login page
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
