import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "medirecord_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // Allow login page access
  if (pathname === "/login") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // If page is inside dashboard or is change-password, protect it
  if (pathname.startsWith("/dashboard") || pathname === "/change-password") {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Decode cookie values (base64 encoded JSON)
      const decoded = Buffer.from(sessionCookie.value, "base64").toString(
        "utf-8",
      );
      const session = JSON.parse(decoded);

      // Enforce mandatory password change
      if (session.mustChangePassword && pathname !== "/change-password") {
        const resetUrl = new URL("/change-password", request.url);
        return NextResponse.redirect(resetUrl);
      }

      // Enforce ADMIN role-based access control for admin modules
      const adminOnlyPaths = [
        "/dashboard/users",
        "/dashboard/audit",
        "/dashboard/storage",
      ];
      const isAdminPath = adminOnlyPaths.some((path) =>
        pathname.startsWith(path),
      );

      if (isAdminPath && session.role !== "ADMIN") {
        // Redirect non-admins to dashboard with an error flag
        const dashboardUrl = new URL(
          "/dashboard?error=unauthorized",
          request.url,
        );
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (e) {
      console.error("Middleware session decode error", e);
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/change-password", "/login"],
};
