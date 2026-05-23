import { auth, clerkClient } from "@clerk/nextjs/server";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set. Please configure it in your .env.local file.");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const CLERK_USER_TIMEOUT_MS = 3000;

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface SessionUser {
  id: string;
  clerkId?: string;
  email: string;
  name: string;
  role: string;
  profileCompleted: boolean;
  phone?: string | null;
  parentPhone?: string | null;
  age?: number | null;
  educationalStage?: string | null;
  createdAt?: Date;
}

export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">) {
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
}

async function syncClerkUserToDatabase(): Promise<SessionUser | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const clerkUserPromise = client.users.getUser(userId).catch((error) => {
      console.warn(`Failed to fetch Clerk user ${userId}:`, error?.message);
      return null;
    });
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`Clerk user fetch timeout for ${userId} after ${CLERK_USER_TIMEOUT_MS}ms`);
        resolve(null);
      }, CLERK_USER_TIMEOUT_MS);
    });

    const clerkUser = await Promise.race([clerkUserPromise, timeoutPromise]);
    if (!clerkUser) {
      console.warn(`Could not fetch Clerk user ${userId} - will try database lookup`);
      // Still try to sync with database if we have a record
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          clerkId: dbUser.clerkId || userId,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          profileCompleted: dbUser.profileCompleted,
          phone: dbUser.phone,
          parentPhone: dbUser.parentPhone,
          age: dbUser.age,
          educationalStage: dbUser.educationalStage,
          createdAt: dbUser.createdAt,
        };
      }
      return null;
    }

    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      return null;
    }

    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: primaryEmail },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId: userId },
        });
      }
    }

    if (!user) {
      const displayName = clerkUser.firstName || clerkUser.lastName
        ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim()
        : primaryEmail.split("@")[0] || "User";

      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: primaryEmail,
          name: displayName,
          role: "student",
          profileCompleted: false,
        },
      });
    }

    return {
      id: user.id,
      clerkId: user.clerkId || userId,
      email: user.email,
      name: user.name,
      role: user.role,
      profileCompleted: user.profileCompleted,
      phone: user.phone,
      parentPhone: user.parentPhone,
      age: user.age,
      educationalStage: user.educationalStage,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error(`Unexpected error syncing Clerk user ${userId}:`, error);
    return null;
  }
}

async function getJwtSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  if (payload.role === "superadmin") {
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      profileCompleted: true,
    };
  }

  if (payload.role === "teacher") {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || user.role !== "teacher") {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileCompleted: user.profileCompleted,
      phone: user.phone,
      parentPhone: user.parentPhone,
      age: user.age,
      educationalStage: user.educationalStage,
      createdAt: user.createdAt,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profileCompleted: user.profileCompleted,
    phone: user.phone,
    parentPhone: user.parentPhone,
    age: user.age,
    educationalStage: user.educationalStage,
    createdAt: user.createdAt,
  };
}

type SessionOptions = {
  /** Student routes: Clerk student wins over teacher admin JWT in the same browser */
  preferStudent?: boolean;
};

function isStudentRole(role: string) {
  return role === "student";
}

function isAdminRole(role: string) {
  return role === "teacher" || role === "superadmin";
}

export async function getSession(options?: SessionOptions): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? await verifyToken(token) : null;
    const clerkSession = await syncClerkUserToDatabase();
    const jwtSession = token ? await getJwtSession() : null;

    if (options?.preferStudent) {
      if (clerkSession && isStudentRole(clerkSession.role)) {
        return clerkSession;
      }
      if (jwtSession && isStudentRole(jwtSession.role)) {
        return jwtSession;
      }
      return null;
    }

    // Admin panel: teacher/superadmin JWT wins over Clerk in the same browser
    if (payload && isAdminRole(payload.role)) {
      return jwtSession;
    }

    if (clerkSession) {
      return clerkSession;
    }

    return jwtSession;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

/** Clerk student session for library, codes, courses, quizzes (ignores teacher admin cookie). */
export async function getStudentSession(): Promise<SessionUser | null> {
  return getSession({ preferStudent: true });
}

export async function getSessionWithRetry(
  maxRetries = 3,
  delayMs = 100,
  options?: SessionOptions
): Promise<SessionUser | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = await getSession(options);
    if (session) {
      return session;
    }
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  return null;
}

export async function getStudentSessionWithRetry(
  maxRetries = 5,
  delayMs = 150
): Promise<SessionUser | null> {
  return getSessionWithRetry(maxRetries, delayMs, { preferStudent: true });
}

export async function markProfileCompleted(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { profileCompleted: true },
  });
}

export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    phone?: string;
    parentPhone?: string;
    age?: number;
    educationalStage?: string;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
