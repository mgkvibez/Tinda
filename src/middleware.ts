import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("next-auth.session-token")?.value;
  const isPublicPath = ["/login", "/signup", "/forgot-password", "/verify-email", "/api/auth"].some(
    (path) => req.nextUrl.pathname.startsWith(path)
  );

  if (isPublicPath) return NextResponse.next();
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
