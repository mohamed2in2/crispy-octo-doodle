import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PANEL_PREFIXES = ["/adminpanel/superadmin", "/adminpanel/teacher"];
const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/library", "/quizzes", "/codes", "/complete-profile", "/account"];
const PROTECTED_API_PREFIXES = ["/api/library", "/api/quizzes", "/api/progress", "/api/auth/complete-profile"];
const AUTH_COOKIE_NAME = "auth_token";

function isProtectedCourseRoute(pathname: string) { return /^\/courses\/[^/]+\/learn(\/.*)?$/.test(pathname); }
function isProtectedPlanRoute(pathname: string) { return /^\/plans\/[^/]+\/learn(\/.*)?$/.test(pathname); }
function isPublicCoursesApi(pathname: string) { return pathname === "/api/courses" || /^\/api\/courses(\/[^/]+\/preview)?$/.test(pathname); }
function isPublicPlansApi(pathname: string) { return pathname === "/api/plans" || /^\/api\/plans\/[^/]+$/.test(pathname); }
function startsWithAny(pathname: string, prefixes: string[]) { return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)); }
function isAdminLoginPage(pathname: string) { return pathname === "/adminpanel" || pathname === "/adminpanel/"; }
function isMutatingApiRequest(req: NextRequest) { return req.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method); }

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const secretStr = process.env.JWT_SECRET;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!secretStr || !token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secretStr));
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Cookie-authenticated browser mutations must originate from this site.
  // Public webhooks do not carry the auth cookie and retain their own validation.
  if (isMutatingApiRequest(req) && req.cookies.has(AUTH_COOKIE_NAME)) {
    const origin = req.headers.get("origin");
    if (!origin || origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "طلب من مصدر غير مسموح" }, { status: 403 });
    }
  }

  if (pathname === "/" || isAdminLoginPage(pathname) || pathname.startsWith("/login") || pathname.startsWith("/signup")) return pass();
  const authed = await hasValidSession(req);

  if (startsWithAny(pathname, ADMIN_PANEL_PREFIXES) && !authed) return NextResponse.redirect(new URL("/adminpanel", req.url));
  if (isProtectedCourseRoute(pathname) && !authed || isProtectedPlanRoute(pathname) && !authed || startsWithAny(pathname, PROTECTED_PAGE_PREFIXES) && !authed) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (pathname.startsWith("/api/courses") && !isPublicCoursesApi(pathname) && !authed) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (pathname.startsWith("/api/plans") && !isPublicPlansApi(pathname) && !authed) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (startsWithAny(pathname, PROTECTED_API_PREFIXES) && !authed) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return pass();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
