import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { isPhoneVerificationBypassed } from "@/lib/aws-sms";
import { getConfigNumberClamped } from "@/lib/config";
import { normalizeEgyptPhone } from "@/lib/phone";
import { prisma } from "./prisma";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set. Please configure it in your .env file.");
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const AUTH_COOKIE_NAME = "auth_token";
const PHONE_VERIFY_COOKIE_NAME = "student_phone_verify";

function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === "production" && process.env.SECURE_COOKIES !== "false";
}

export interface JWTPayload { id: string; email: string; name: string; role: string; isOwner?: boolean; deviceId?: string; iat?: number; exp?: number; }
export interface SessionUser {
  id: string; clerkId?: string; email: string; name: string; role: string; isOwner?: boolean; profileCompleted: boolean;
  phone?: string | null; parentPhone?: string | null; age?: number | null; educationalStage?: string | null;
  createdAt?: Date; deviceId?: string; referralCode?: string | null; streakFreezes?: number;
}
type PhoneChallengePayload = { phone: string; codeHash?: string; method?: string; iat?: number; exp?: number; };

export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">) {
  const days = await getConfigNumberClamped("jwt_expiry_days", 1, 365);
  return new SignJWT(payload as Record<string, unknown>).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(JWT_SECRET);
}
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try { const { payload } = await jwtVerify(token, JWT_SECRET); return payload as unknown as JWTPayload; } catch { return null; }
}
export async function setAuthCookie(token: string) {
  const store = await cookies();
  const days = await getConfigNumberClamped("jwt_expiry_days", 1, 365);
  store.set(AUTH_COOKIE_NAME, token, { httpOnly: true, secure: shouldUseSecureCookies(), sameSite: "lax", maxAge: 60 * 60 * 24 * days, path: "/" });
}
export async function clearAuthCookie() { (await cookies()).delete(AUTH_COOKIE_NAME); }
function hashVerificationCode(code: string) { return createHash("sha256").update(code).digest("hex"); }
export async function createPhoneVerificationChallenge(phone: string, code?: string, method?: string) {
  const payload: Record<string, unknown> = { phone };
  if (code) payload.codeHash = hashVerificationCode(code);
  if (method) payload.method = method;
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("3m").sign(JWT_SECRET);
}
export async function setPhoneVerificationCookie(token: string) {
  (await cookies()).set(PHONE_VERIFY_COOKIE_NAME, token, { httpOnly: true, secure: shouldUseSecureCookies(), sameSite: "strict", maxAge: 60 * 3, path: "/" });
}
export async function clearPhoneVerificationCookie() { (await cookies()).delete(PHONE_VERIFY_COOKIE_NAME); }
export async function verifyPhoneVerificationCookie(phone: string, code: string) {
  const token = (await cookies()).get(PHONE_VERIFY_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const challenge = payload as unknown as PhoneChallengePayload;
    if (!challenge?.phone || challenge.phone !== normalizeEgyptPhone(String(phone))) return false;
    if (isPhoneVerificationBypassed()) return true;
    return Boolean(challenge.codeHash) && challenge.codeHash === hashVerificationCode(code.trim());
  } catch { return false; }
}

async function getJwtSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  if (payload.role === "superadmin") {
    // No special id is trusted. Every superadmin token must resolve to an active
    // database account, so disabling that account revokes the session.
    const admin = await prisma.user.findFirst({ where: { id: payload.id, role: "superadmin", isDeleted: false } });
    if (!admin || !admin.isActive) return null;
    return { id: admin.id, email: admin.email, name: admin.name, role: "superadmin", isOwner: admin.isOwner, profileCompleted: true, deviceId: payload.deviceId };
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive || user.isDeleted) return null;
  return {
    id: user.id, email: user.email, name: user.name, role: user.role, profileCompleted: user.profileCompleted,
    phone: user.phone, parentPhone: user.parentPhone, age: user.age, educationalStage: user.educationalStage,
    createdAt: user.createdAt, deviceId: payload.deviceId, referralCode: user.referralCode, streakFreezes: user.streakFreezes,
  };
}

type SessionOptions = { preferStudent?: boolean; };
export async function getSession(options?: SessionOptions): Promise<SessionUser | null> {
  const session = await getJwtSession();
  return !session || (options?.preferStudent && session.role !== "student") ? null : session;
}
export async function getStudentSession(): Promise<SessionUser | null> { return getSession({ preferStudent: true }); }
export async function getSessionWithRetry(maxRetries = 3, delayMs = 100, options?: SessionOptions): Promise<SessionUser | null> {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const session = await getSession(options);
    if (session) return session;
    if (attempt < maxRetries - 1) await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
  }
  return null;
}
export async function getStudentSessionWithRetry(maxRetries = 3, delayMs = 80): Promise<SessionUser | null> { return getSessionWithRetry(maxRetries, delayMs, { preferStudent: true }); }
export async function markProfileCompleted(userId: string) { return prisma.user.update({ where: { id: userId }, data: { profileCompleted: true } }); }
export async function updateUserProfile(userId: string, data: { name?: string; phone?: string; parentPhone?: string; age?: number; educationalStage?: string; }) { return prisma.user.update({ where: { id: userId }, data }); }
