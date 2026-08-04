import { ApiError, badRequest } from "./errors";

/**
 * Minimal request validation.
 *
 * Written by hand instead of using zod on purpose: adding a dependency could
 * not be installed or type-checked in the environment this was authored in,
 * and the surface below covers what the existing handlers already parse. If
 * zod is adopted later these signatures map onto it directly.
 *
 * Every failure throws an ApiError, so a route wrapped by `withRoute` turns a
 * bad payload into a clean 400 without its own try/catch.
 */

/** Parse a JSON body, turning malformed JSON into a 400 rather than a 500. */
export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    throw badRequest("\u0635\u064a\u063a\u0629 \u0627\u0644\u0637\u0644\u0628 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw badRequest("\u0635\u064a\u063a\u0629 \u0627\u0644\u0637\u0644\u0628 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629");
  }

  return parsed as Record<string, unknown>;
}

type StringOptions = {
  min?: number;
  max?: number;
  /** Field name used in the error message; defaults to the key. */
  label?: string;
};

/**
 * Require a non-empty trimmed string.
 *
 * Note this rejects non-string types rather than coercing them. Several current
 * handlers do `String(value)`, which quietly turns `{}` into "[object Object]"
 * and an array into a comma-joined string before it reaches the database.
 */
export function requireString(
  body: Record<string, unknown>,
  key: string,
  options: StringOptions = {}
): string {
  const { min = 1, max = 10_000, label = key } = options;
  const raw = body[key];

  if (typeof raw !== "string") {
    throw badRequest(`\u0627\u0644\u062d\u0642\u0644 "${label}" \u0645\u0637\u0644\u0648\u0628`);
  }

  const value = raw.trim();

  if (value.length < min) {
    throw badRequest(`\u0627\u0644\u062d\u0642\u0644 "${label}" \u0645\u0637\u0644\u0648\u0628`);
  }

  if (value.length > max) {
    throw badRequest(`\u0627\u0644\u062d\u0642\u0644 "${label}" \u0623\u0637\u0648\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u0645\u0648\u062d (${max})`);
  }

  return value;
}

/** Same as requireString but returns undefined when the key is absent or empty. */
export function optionalString(
  body: Record<string, unknown>,
  key: string,
  options: StringOptions = {}
): string | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === "") return undefined;
  return requireString(body, key, options);
}

/**
 * Require an identifier-shaped string.
 *
 * The length cap matters: an unbounded id goes straight into a Prisma `where`
 * clause, and very large values are a cheap way to waste database time.
 */
export function requireId(
  body: Record<string, unknown>,
  key: string,
  label = key
): string {
  return requireString(body, key, { min: 1, max: 128, label });
}

/** Require the value to be one of a fixed set. Prevents free-form text reaching enum-ish columns. */
export function requireEnum<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  label = key
): T {
  const value = requireString(body, key, { label, max: 64 });

  if (!(allowed as readonly string[]).includes(value)) {
    throw badRequest(
      `\u0627\u0644\u062d\u0642\u0644 "${label}" \u063a\u064a\u0631 \u0635\u0627\u0644\u062d`
    );
  }

  return value as T;
}

type IntOptions = {
  min?: number;
  max?: number;
  label?: string;
};

/** Optional bounded integer. Rejects NaN, Infinity, floats and numeric strings out of range. */
export function optionalInt(
  body: Record<string, unknown>,
  key: string,
  options: IntOptions = {}
): number | undefined {
  const { min, max, label = key } = options;
  const raw = body[key];

  if (raw === undefined || raw === null || raw === "") return undefined;

  const value = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isInteger(value)) {
    throw badRequest(`\u0627\u0644\u062d\u0642\u0644 "${label}" \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064b \u0635\u062d\u064a\u062d\u0627\u064b`);
  }

  if (min !== undefined && value < min) {
    throw badRequest(`\u0627\u0644\u062d\u0642\u0644 "${label}" \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 ${min} \u0623\u0648 \u0623\u0643\u0628\u0631`);
  }

  if (max !== undefined && value > max) {
    throw badRequest(`\u0627\u0644\u062d\u0642\u0644 "${label}" \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 ${max} \u0623\u0648 \u0623\u0635\u063a\u0631`);
  }

  return value;
}

/** Read and length-cap a query string parameter. */
export function optionalQueryParam(
  url: URL,
  key: string,
  maxLength = 128
): string | undefined {
  const raw = url.searchParams.get(key);
  if (raw === null || raw.trim() === "") return undefined;

  const value = raw.trim();
  if (value.length > maxLength) {
    throw badRequest(`\u0627\u0644\u0645\u0639\u0627\u0645\u0644 "${key}" \u063a\u064a\u0631 \u0635\u0627\u0644\u062d`);
  }

  return value;
}

export { ApiError };
