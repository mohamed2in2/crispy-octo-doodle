import { describe, expect, it } from "vitest";
import {
  assertNoDirectIdentifiers,
  buildOutboundProviderMessages,
  buildSafeLearnerContext,
  normalizePrompt,
  scrubDirectIdentifiers,
} from "./ai-egress";

describe("ai egress boundary", () => {
  it("normalizes and length-limits prompts", () => {
    const long = `  hello   world  ${"x".repeat(5000)}`;
    const out = normalizePrompt(long, 20);
    expect(out.startsWith("hello world")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
  });

  it("scrubs emails and egyptian phones", () => {
    const raw = "mail me at student@example.com or 01012345678 / +201112223344";
    const scrubbed = scrubDirectIdentifiers(raw);
    expect(scrubbed).not.toContain("student@example.com");
    expect(scrubbed).not.toContain("01012345678");
    expect(scrubbed).not.toContain("+201112223344");
  });

  it("outbound payload excludes name email phone and raw identifiers", () => {
    const messages = buildOutboundProviderMessages({
      systemPrompt: "You are a tutor.",
      userMessage: "I am Ahmed, email a@b.com phone 01099998888, help with math",
      safeContext: buildSafeLearnerContext({
        educationalStage: "sec_1",
        courseCount: 2,
        averageScore: 71,
        subjects: ["math"],
        weakTopics: ["fractions"],
      }),
      history: [
        { role: "user", content: "my name is Sara and email sara@school.edu" },
        { role: "assistant", content: "Sure, let's continue." },
      ],
    });

    const blob = JSON.stringify(messages);
    expect(blob).not.toMatch(/Ahmed|Sara|a@b\.com|sara@school\.edu|01099998888/i);
    expect(blob).toContain("[redacted-email]");
    expect(() => assertNoDirectIdentifiers(messages)).not.toThrow();
  });

  it("blocks payloads that still contain direct identifiers", () => {
    expect(() => assertNoDirectIdentifiers({ text: "reach me at leak@example.com" })).toThrow(
      /blocked/i,
    );
  });
});
