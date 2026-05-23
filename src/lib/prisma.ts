import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please configure it in your .env/.env.local file."
    );
  }

  if (dbUrl.startsWith("file:") || dbUrl.startsWith("libsql:")) {
    const adapter = new PrismaLibSql({ url: dbUrl });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({ connectionString: dbUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
