import crypto from "crypto";

type PrismaTransactionClient = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
};

/** Acquires a transaction-scoped PostgreSQL advisory lock; SQLite is a no-op. */
export async function acquireAdvisoryLock(lockName: string, tx: PrismaTransactionClient): Promise<void> {
  if (!(process.env.DATABASE_URL ?? "").startsWith("postgres")) return;

  const lockId = crypto.createHash("md5").update(lockName).digest().readInt32LE(0);
  try {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockId})`);
  } catch (error) {
    console.error(`Failed to acquire advisory lock for '${lockName}':`, error);
    throw error;
  }
}
