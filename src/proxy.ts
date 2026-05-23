import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/verify-email(.*)",
  "/reset-password(.*)",
  "/api/public(.*)",
  "/api/health",
  "/api/auth/callback(.*)",
]);

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/library(.*)",
  "/courses(.*)",
  "/quizzes(.*)",
  "/codes(.*)",
  "/complete-profile(.*)",
  "/adminpanel(.*)",
  "/api/courses(.*)",
  "/api/library(.*)",
  "/api/quizzes(.*)",
  "/api/progress(.*)",
  "/api/auth/me(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth();

  // If it's a protected route and user is not authenticated, redirect to login
  if (isProtectedRoute(req) && !userId) {
    const loginUrl = new URL("/login", req.url);
    // Add redirect parameter to return to the original page after login
    loginUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to access login/signup, redirect to dashboard
  if ((req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup") && userId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Allow the request to proceed
  return NextResponse.next();
});

// Configure which routes proxy should run on
export const config = {
  // Match all request paths except static files, next internals, etc
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

