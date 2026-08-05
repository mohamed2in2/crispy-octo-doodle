import { Prisma } from "@/generated/prisma/client";

const TRANSIENT_ERROR_CODES = new Set(["P2034", "P2028"]);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorDetails(error: unknown): { code?: string; message?: string } {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
    return { code, message: error.message };
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as Record<string, unknown>;
    return {
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message: typeof candidate.message === "string" ? candidate.message : undefined,
    };
  }
  return {};
}

/** Retries transient transaction conflicts and SQLite busy errors with jitter. */
export async function withDbRetry<T>(operation: () => Promise<T>, maxRetries = 3, baseDelayMs = 50): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      attempts += 1;
      const details = errorDetails(error);
      const isTransient = error instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_ERROR_CODES.has(error.code);
      const isSqliteBusy = details.message?.includes("database is locked") || details.message?.includes("SQLITE_BUSY") || details.code === "SQLITE_BUSY";
      if ((!isTransient && !isSqliteBusy) || attempts >= maxRetries) throw error;
      const maxDelay = baseDelayMs * 2 ** attempts;
      await wait(Math.floor(Math.random() * maxDelay) + baseDelayMs);
    }
  }
}
