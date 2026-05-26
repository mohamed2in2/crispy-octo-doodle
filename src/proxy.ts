import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

/** Admin-panel sub-pages — require a valid session; redirect to /adminpanel on failure */
const ADMIN_PANEL_PREFIXES = [
  "/adminpanel/superadmin",
  "/adminpanel/teacher",
];

/** Student/user routes — require a valid session; redirect to /login on failure */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/library",
  "/courses",
  "/quizzes",
  "/codes",
  "/complete-profile",
  "/account",
  "/api/courses",
  "/api/library",
  "/api/quizzes",
  "/api/progress",
  "/api/auth/me",
  "/api/auth/complete-profile",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** /adminpanel login page itself — exact match only, never prefix */
function isAdminLoginPage(pathname: string) {
  return pathname === "/adminpanel" || pathname === "/adminpanel/";
}

async function hasValidSession(req: NextRequest) {
  if (!JWT_SECRET) return false;
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/") return NextResponse.next();

  // Admin panel login page — always public
  if (isAdminLoginPage(pathname)) return NextResponse.next();

  const authed = await hasValidSession(req);

  // Admin sub-pages: redirect to /adminpanel login if no session
  if (startsWithAny(pathname, ADMIN_PANEL_PREFIXES) && !authed) {
    return NextResponse.redirect(new URL("/adminpanel", req.url));
  }

  // Student routes: redirect to /login if no session
  if (startsWithAny(pathname, PROTECTED_PREFIXES) && !authed) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in students away from login/signup
  if ((pathname === "/login" || pathname === "/signup") && authed) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
