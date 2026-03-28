import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth routes that logged-in users should not see
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/admin/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For demo/development: Allow all dashboard access
  // TODO: Replace with proper JWT validation when backend is connected
  // Read JWT from httpOnly cookie (set by backend on login)
  // const token = request.cookies.get("medvision_token")?.value;
  // const userRole = request.cookies.get("medvision_role")?.value as
  //   | "student"
  //   | "admin"
  //   | undefined;

  // Redirect logged-in users away from auth pages
  // if (AUTH_ROUTES.some((route) => pathname.startsWith(route)) && token) {
  //   const redirectTo =
  //     userRole === "admin" ? "/admin/dashboard" : "/dashboard";
  //   return NextResponse.redirect(new URL(redirectTo, request.url));
  // }

  // Protect dashboard routes
  // if (pathname.startsWith("/dashboard") && (!token || userRole !== "student")) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  // if (
  //   pathname.startsWith("/admin/dashboard") &&
  //   (!token || userRole !== "admin")
  // ) {
  //   return NextResponse.redirect(new URL("/admin/login", request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/dashboard/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/admin/login",
  ],
};
