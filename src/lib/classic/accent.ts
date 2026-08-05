/*
 * One accent colour rule.
 *
 * Teachers can pick an accent colour, but the stored default is #6366f1 -
 * indigo, which together with violet is the single most recognisable "this was
 * made by an AI" colour in modern UI. Every page that read accentColor fell
 * back to it, so an unconfigured teacher looked like a generated template.
 *
 * safeAccent() does two things:
 *   1. Rejects anything that is not a plain 6-digit hex, so a stored value can
 *      never break a page or smuggle CSS into a style attribute.
 *   2. Rejects the banned AI palette and falls back to the platform blue.
 *
 * Add to BANNED rather than special-casing a colour at a call site; the point
 * of this file is that there is exactly one place to look.
 */

export const CLASSIC_ACCENT = "#1266bd";

const BANNED = new Set([
  // indigo
  "#6366f1",
  "#818cf8",
  "#4f46e5",
  "#4338ca",
  // violet and purple
  "#8b5cf6",
  "#a855f7",
  "#7c3aed",
  "#c084fc",
  "#9333ea",
  // neon cyan
  "#22d3ee",
  "#06b6d4",
  "#00e5ff",
  "#67e8f9",
  // ChatGPT green
  "#10a37f",
  "#0d8f6f",
]);

export function safeAccent(raw: string | null | undefined): string {
  if (!raw) return CLASSIC_ACCENT;
  const value = raw.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(value)) return CLASSIC_ACCENT;
  if (BANNED.has(value)) return CLASSIC_ACCENT;
  return value;
}
