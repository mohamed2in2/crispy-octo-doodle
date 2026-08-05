import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filename) {
  const path = join(root, filename);
  if (!existsSync(path)) return {};
  const variables = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    variables[key] = value;
  }
  return variables;
}

const merged = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };
const production = merged.NODE_ENV === "production";
const placeholder = /replace-with|your-secret|your-.*key|change-me|example|xxxxxxxx|placeholder/i;
const configured = (key) => (merged[key]?.trim() ?? "");
const isPostgres = (value) => (value.startsWith("postgresql://") || value.startsWith("postgres://")) && !/YOUR_DB_PASSWORD|USER:PASSWORD|replace-me/i.test(value);
const validSecret = (value) => value.length >= 32 && !placeholder.test(value);

const required = [
  {
    key: "DATABASE_URL",
    test: (value) => !production && (value.startsWith("file:") || value.startsWith("libsql:")) || isPostgres(value),
    hint: production ? "A real PostgreSQL connection string is required in production" : "Use file:./dev.db locally or a real PostgreSQL URI",
  },
  {
    key: "JWT_SECRET",
    test: (value) => value.length >= (production ? 32 : 16) && !placeholder.test(value),
    hint: production ? "Use a unique random secret of at least 32 characters" : "Use at least 16 non-placeholder characters",
  },
  ...(production ? [
    { key: "DIRECT_URL", test: isPostgres, hint: "Use a direct non-placeholder PostgreSQL connection for migrations" },
    { key: "CRON_SECRET", test: validSecret, hint: "Use a unique random secret of at least 32 characters" },
    { key: "CONFIG_ENCRYPTION_KEY", test: validSecret, hint: "Use a stable unique encryption secret of at least 32 characters" },
    { key: "NEXT_PUBLIC_SITE_URL", test: (value) => /^https:\/\//.test(value) && !/localhost|example/i.test(value), hint: "Use the canonical HTTPS production URL" },
    { key: "NEXT_PUBLIC_RECAPTCHA_SITE_KEY", test: (value) => value.length >= 20 && !placeholder.test(value), hint: "Configure the reCAPTCHA Enterprise site key" },
    { key: "RECAPTCHA_API_KEY", test: (value) => value.length >= 20 && !placeholder.test(value), hint: "Configure the server-only reCAPTCHA Enterprise API key" },
  ] : []),
];

const unsafeProductionFlags = ["BYPASS_PHONE_VERIFICATION", "DEV_SKIP_SMS", "TWILIO_BYPASS_VERIFICATION", "RECAPTCHA_BYPASS"];
let failed = 0;
console.log(`Environment validation (${production ? "production" : "development"})\n`);
const envFiles = [".env", ".env.local"].filter((file) => existsSync(join(root, file)));
if (envFiles.length) console.log(`Loaded: ${envFiles.join(", ")}\n`);

for (const { key, test, hint } of required) {
  const value = configured(key);
  if (!value || !test(value)) {
    console.error(`${value ? "INVALID" : "MISSING"}: ${key}\n         ${hint}\n`);
    failed += 1;
  } else console.log(`OK: ${key}`);
}

if (production) {
  for (const key of unsafeProductionFlags) {
    if (configured(key).toLowerCase() === "true") {
      console.error(`UNSAFE: ${key} must not be true in production\n`);
      failed += 1;
    }
  }
}
for (const key of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL"]) if (!configured(key)) console.warn(`WARN: ${key} is not set`);

if (failed) {
  console.error(`\n${failed} production configuration requirement(s) failed.`);
  process.exit(1);
}
console.log("\nEnvironment configuration passed.");
