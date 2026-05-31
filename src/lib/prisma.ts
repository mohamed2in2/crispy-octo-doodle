import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const FALLBACK_SQLITE_URL = "file:./prisma/dev.db";

function resolveDatabaseUrl(rawUrl: string): string {
  const dbUrl = rawUrl.trim();

  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please configure it in your .env/.env.local file."
    );
  }

  if (dbUrl.startsWith("file:")) {
    const sqlitePath = dbUrl.slice("file:".length);

    if (process.platform !== "win32" && /^[A-Za-z]:[\\/]/.test(sqlitePath)) {
      console.warn(
        `[prisma] Ignoring Windows SQLite path \"${sqlitePath}\" on ${process.platform}; using ${FALLBACK_SQLITE_URL}`
      );
      return FALLBACK_SQLITE_URL;
    }
  }

  return dbUrl;
}

function createPrismaClient() {
  const dbUrl = resolveDatabaseUrl(process.env.DATABASE_URL ?? "");

  if (dbUrl.startsWith("file:") || dbUrl.startsWith("libsql:")) {
    const adapter = new PrismaLibSql({ url: dbUrl });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({ connectionString: dbUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
