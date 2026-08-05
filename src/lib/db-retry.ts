import { Prisma } from "@/generated/prisma/client";

const TRANSIENT_ERROR_CODES = new Set([
  "P2034", // Transaction failed due to a write conflict or a deadlock
  "P2028", // Transaction API error
]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isDatabaseBusy(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = "code" in error ? error.code : undefined;
  return error.message.includes("database is locked") ||
    error.message.includes("SQLITE_BUSY") ||
    code === "SQLITE_BUSY";
}

/**
 * Wraps a database operation with automatic retries for transient errors
 * like deadlocks or SQLite busy states.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 50
): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      attempts++;

      const isTransient =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        TRANSIENT_ERROR_CODES.has(error.code);

      if ((!isTransient && !isDatabaseBusy(error)) || attempts >= maxRetries) {
        throw error;
      }

      // Exponential backoff with decorrelated jitter
      const maxDelay = baseDelayMs * Math.pow(2, attempts);
      const delay = Math.floor(Math.random() * maxDelay) + baseDelayMs;
      await wait(delay);
    }
  }
}
