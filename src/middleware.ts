import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserType } from "@prisma/client";

export async function middleware(req: NextRequest) {
  const session = await auth();
  const token = (session as any)?.user;
  const pathname = req.nextUrl.pathname;

  // Allow access to auth pages without authentication
  const publicPaths = [
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-email",
    "/api/auth",
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    // Redirect authenticated users from auth pages to their dashboard
    if (token) {
      const userType = token.userType as UserType;
      if (userType === UserType.Candidate) {
        return NextResponse.redirect(new URL("/candidate/dashboard", req.url));
      } else if (userType === UserType.Employer) {
        return NextResponse.redirect(new URL("/employer/dashboard", req.url));
      } else if (userType === UserType.Admin) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protect specific routes based on user type
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userType = token.userType as UserType;

  if (pathname.startsWith("/candidate") && userType !== UserType.Candidate) {
    return NextResponse.redirect(new URL("/access-denied", req.url));
  }
  if (pathname.startsWith("/employer") && userType !== UserType.Employer) {
    return NextResponse.redirect(new URL("/access-denied", req.url));
  }
  if (pathname.startsWith("/admin") && userType !== UserType.Admin) {
    return NextResponse.redirect(new URL("/access-denied", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
