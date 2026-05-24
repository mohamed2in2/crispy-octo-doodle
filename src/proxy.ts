import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/api/public",
  "/api/health",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/phone/send-code",
];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/library",
  "/courses",
  "/quizzes",
  "/codes",
  "/complete-profile",
  "/account",
  "/adminpanel",
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

async function hasValidSession(req: NextRequest) {
  if (!JWT_SECRET) {
    return false;
  }

  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/") {
    return NextResponse.next();
  }

  const isPublic = startsWithAny(pathname, PUBLIC_PREFIXES);
  const isProtected = startsWithAny(pathname, PROTECTED_PREFIXES);

  const authed = await hasValidSession(req);

  if (isProtected && !authed) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/signup") && authed) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isPublic && !isProtected) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
