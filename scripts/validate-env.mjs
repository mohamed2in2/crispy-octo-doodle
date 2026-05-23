/**
 * Validates required environment variables for this project.
 * Run: node scripts/validate-env.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(filename) {
  const path = join(root, filename);
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const merged = {
  ...loadEnvFile(".env"),
  ...loadEnvFile(".env.local"),
  ...process.env,
};

const REQUIRED = [
  {
    key: "DATABASE_URL",
    test: (v) => {
      if (v.startsWith("file:") || v.startsWith("libsql:")) return true;
      return (
        (v.startsWith("postgresql://") || v.startsWith("postgres://")) &&
        !/YOUR_DB_PASSWORD|USER:PASSWORD|replace-me/i.test(v)
      );
    },
    hint: "Use file:./prisma/dev.db (local) or a real Supabase PostgreSQL URI",
  },
  {
    key: "JWT_SECRET",
    test: (v) => v.length >= 16 && !/replace-with|your-secret|change-me/i.test(v),
    hint: "At least 16 characters; not a placeholder",
  },
  {
    key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    test: (v) => v.startsWith("pk_"),
    hint: "Clerk publishable key (pk_test_... or pk_live_...)",
  },
  {
    key: "CLERK_SECRET_KEY",
    test: (v) => v.startsWith("sk_"),
    hint: "Clerk secret key (sk_test_... or sk_live_...)",
  },
];

const RECOMMENDED = [
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_SITE_URL",
];

let failed = 0;

console.log("Environment validation\n");

const envFiles = [".env", ".env.local"].filter((f) => existsSync(join(root, f)));
if (envFiles.length === 0) {
  console.error("No .env or .env.local file found.");
  console.error("Copy .env.example to .env and fill in your values.\n");
  process.exit(1);
}

console.log(`Loaded: ${envFiles.join(", ")}\n`);

for (const { key, test, hint } of REQUIRED) {
  const value = merged[key]?.trim() ?? "";
  if (!value) {
    console.error(`MISSING: ${key}`);
    console.error(`         ${hint}\n`);
    failed++;
    continue;
  }
  if (!test(value)) {
    console.error(`INVALID: ${key}`);
    console.error(`         ${hint}\n`);
    failed++;
    continue;
  }
  console.log(`OK: ${key}`);
}

for (const key of RECOMMENDED) {
  const value = merged[key]?.trim() ?? "";
  if (!value) {
    console.warn(`WARN: ${key} is not set (optional but recommended)`);
  }
}

if (merged.DATABASE_URL?.includes("file:")) {
  console.warn(
    "\nWARN: DATABASE_URL uses file: — this project uses PostgreSQL (PrismaPg). Use postgresql://..."
  );
}

if (failed > 0) {
  console.error(`\n${failed} required variable(s) need fixing. See .env.example`);
  process.exit(1);
}

console.log("\nAll required environment variables look good.");
