/**
 * Privacy boundary for outbound AI provider traffic.
 * Direct learner identifiers and raw conversation history never leave the server.
 */

export const MAX_PROMPT_CHARS = 2000;
export const MAX_HISTORY_TURNS = 6;

export type EgressMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type SafeLearnerContext = {
  stage: string | null;
  courseCount: number;
  averageScore: number;
  quizzesTaken: number;
  videosWatched: number;
  subjects: string[];
  weakTopics: string[];
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?20|0)?1[0125]\d{8}\b/g;
const LONG_DIGIT_RE = /\b\d{8,}\b/g;

export function normalizePrompt(raw: string, max = MAX_PROMPT_CHARS): string {
  return String(raw ?? "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Redact emails, phones, long ids, and any known learner name tokens. */
export function scrubDirectIdentifiers(
  text: string,
  knownNames: string[] = [],
): string {
  let out = String(text ?? "")
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .replace(LONG_DIGIT_RE, "[redacted-id]");

  const tokens = knownNames
    .flatMap((name) => String(name).split(/\s+/))
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);

  for (const token of tokens) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi");
    out = out.replace(re, "[redacted-name]");
  }

  return out;
}

export function buildSafeLearnerContext(input: {
  educationalStage?: string | null;
  courseCount?: number;
  averageScore?: number;
  quizzesTaken?: number;
  videosWatched?: number;
  subjects?: string[];
  weakTopics?: string[];
}): SafeLearnerContext {
  return {
    stage: input.educationalStage ?? null,
    courseCount: Number(input.courseCount ?? 0) || 0,
    averageScore: Number(input.averageScore ?? 0) || 0,
    quizzesTaken: Number(input.quizzesTaken ?? 0) || 0,
    videosWatched: Number(input.videosWatched ?? 0) || 0,
    subjects: (input.subjects ?? []).filter(Boolean).slice(0, 8),
    weakTopics: (input.weakTopics ?? []).filter(Boolean).slice(0, 8),
  };
}

export function summarizeSafeContext(ctx: SafeLearnerContext): string {
  return [
    "Learner snapshot (no direct identifiers):",
    `- stage: ${ctx.stage ?? "unspecified"}`,
    `- courses: ${ctx.courseCount}`,
    `- averageScore: ${ctx.averageScore}%`,
    `- quizzesTaken: ${ctx.quizzesTaken}`,
    `- videosWatched: ${ctx.videosWatched}`,
    `- subjects: ${ctx.subjects.join(", ") || "none"}`,
    `- weakTopics: ${ctx.weakTopics.join(", ") || "none"}`,
  ].join("\n");
}

/** Build the only payload allowed to leave the server toward external AI providers. */
export function buildOutboundProviderMessages(args: {
  systemPrompt: string;
  userMessage: string;
  safeContext: SafeLearnerContext;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  knownNames?: string[];
}): EgressMessage[] {
  const names = args.knownNames ?? [];
  const userMessage = scrubDirectIdentifiers(
    normalizePrompt(args.userMessage),
    names,
  );
  const history = (args.history ?? [])
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({
      role: m.role,
      content: scrubDirectIdentifiers(normalizePrompt(m.content, 800), names),
    }))
    .filter((m) => m.content.length > 0);

  return [
    {
      role: "system",
      content: `${args.systemPrompt}\n\n${summarizeSafeContext(args.safeContext)}`,
    },
    ...history,
    { role: "user", content: userMessage },
  ];
}

export function assertNoDirectIdentifiers(payload: unknown): void {
  const blob = JSON.stringify(payload);
  // Reset sticky global regex state before testing.
  EMAIL_RE.lastIndex = 0;
  PHONE_RE.lastIndex = 0;
  if (EMAIL_RE.test(blob) || PHONE_RE.test(blob)) {
    throw new Error("AI egress blocked: direct learner identifiers detected");
  }
}
