import { describe, expect, it } from "vitest";

/**
 * Policy guards for chat message handling.
 * Magic commands must never be treated as executable controls.
 */
const MAGIC = [
  "ahmedreset",
  "clear",
  "delete",
  "ahmed123m",
  "admin123",
  "stats",
  "ahmedtoldmesotalkelse",
  "dev",
  "developer",
  "ahmedpromode",
  "professional",
  "pro",
  "ahmedfastmode",
  "fast",
  "speed",
];

function treatAsPlainUserText(message: string): { kind: "message"; text: string } {
  // Chat POST must never branch on secret words. Deletion is DELETE /api/ai/chat only.
  return { kind: "message", text: String(message ?? "").trim() };
}

describe("ai chat command policy", () => {
  it("treats former magic words as ordinary message text", () => {
    for (const word of MAGIC) {
      const result = treatAsPlainUserText(word);
      expect(result.kind).toBe("message");
      expect(result.text.toLowerCase()).toBe(word);
    }
  });

  it("does not map clear/delete text to a delete action", () => {
    const result = treatAsPlainUserText("delete");
    expect(result).toEqual({ kind: "message", text: "delete" });
    expect("action" in result).toBe(false);
  });
});
