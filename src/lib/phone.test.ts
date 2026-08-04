import { describe, expect, it } from "vitest";
import { formatDisplayPhone, normalizeEgyptPhone } from "@/lib/phone";

/**
 * These are characterisation tests: they pin down what the function does
 * *today* so a refactor can't change it silently. Where current behaviour looks
 * questionable it is marked, not quietly asserted as correct.
 */

const CANONICAL = "+201012345678";

describe("normalizeEgyptPhone", () => {
  describe("local Egyptian format", () => {
    it("converts a local 01X number to E.164", () => {
      expect(normalizeEgyptPhone("01012345678")).toBe(CANONICAL);
    });

    it("accepts every Egyptian mobile prefix", () => {
      expect(normalizeEgyptPhone("01112345678")).toBe("+201112345678");
      expect(normalizeEgyptPhone("01212345678")).toBe("+201212345678");
      expect(normalizeEgyptPhone("01512345678")).toBe("+201512345678");
    });

    it("strips spaces, dashes and parentheses", () => {
      expect(normalizeEgyptPhone("010 1234 5678")).toBe(CANONICAL);
      expect(normalizeEgyptPhone("010-1234-5678")).toBe(CANONICAL);
      expect(normalizeEgyptPhone(" (010) 1234 5678 ")).toBe(CANONICAL);
    });
  });

  describe("Arabic-Indic numerals", () => {
    it("converts Arabic-Indic digits (U+0660 range)", () => {
      expect(normalizeEgyptPhone("\u0660\u0661\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668")).toBe(CANONICAL);
    });

    it("converts Extended Arabic-Indic digits (U+06F0 range)", () => {
      expect(normalizeEgyptPhone("\u06F0\u06F1\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8")).toBe(CANONICAL);
    });

    it("handles a mix of Arabic-Indic and ASCII digits", () => {
      // ٠١٠ + 1234567 + ٨  ->  01012345678
      expect(normalizeEgyptPhone("\u0660\u0661\u06601234567\u0668")).toBe(CANONICAL);
    });
  });

  describe("international input", () => {
    it("normalises an Egyptian E.164 number", () => {
      expect(normalizeEgyptPhone("+201012345678")).toBe(CANONICAL);
    });

    it("converts a 00 prefix to +", () => {
      expect(normalizeEgyptPhone("00201012345678")).toBe(CANONICAL);
    });

    it("accepts a bare 20-prefixed number without +", () => {
      expect(normalizeEgyptPhone("201012345678")).toBe(CANONICAL);
    });

    it("passes through non-Egyptian E.164 numbers unchanged", () => {
      // Intentional: supports values like TWILIO_FROM_NUMBER.
      expect(normalizeEgyptPhone("+14155552671")).toBe("+14155552671");
      expect(normalizeEgyptPhone("+447911123456")).toBe("+447911123456");
    });

    it("preserves formatting inside a passed-through E.164 number", () => {
      // Note the asymmetry: the + branch returns `cleaned`, not the digits-only
      // form, so separators survive. Local input has them stripped.
      expect(normalizeEgyptPhone("+1 415 555 2671")).toBe("+1 415 555 2671");
    });
  });

  describe("rejects invalid input", () => {
    it("throws on a too-short number", () => {
      expect(() => normalizeEgyptPhone("12345")).toThrow();
    });

    it("throws on an empty string", () => {
      expect(() => normalizeEgyptPhone("")).toThrow();
    });

    it("throws on text with no number in it", () => {
      expect(() => normalizeEgyptPhone("not a phone number")).toThrow();
    });

    it("throws on a landline", () => {
      // Egyptian landlines start 02, so they fail the 01X mobile regex.
      expect(() => normalizeEgyptPhone("0223456789")).toThrow();
    });
  });

  describe("documented quirks", () => {
    it("extracts a mobile number embedded in surrounding digits", () => {
      // The fallback searches for /01[0-9]{9}/ anywhere in the digit string.
      // Lenient by design, but it means a malformed number can still resolve to
      // a valid one rather than being rejected.
      expect(normalizeEgyptPhone("0201012345678")).toBe(CANONICAL);
    });

    it("accepts any 12-digit number starting with 2 as Egyptian", () => {
      // The `digits.startsWith("2")` branch is broader than intended: this is
      // not an Egyptian number, but it gets a + and is treated as valid.
      // Pinned here because it is current behaviour, NOT because it is correct.
      expect(normalizeEgyptPhone("212345678901")).toBe("+212345678901");
    });
  });
});

describe("formatDisplayPhone", () => {
  it("converts E.164 back to local display format", () => {
    expect(formatDisplayPhone("+201012345678")).toBe("01012345678");
  });

  it("leaves an already-local number alone", () => {
    expect(formatDisplayPhone("01012345678")).toBe("01012345678");
  });

  it("handles a 20-prefixed number without +", () => {
    expect(formatDisplayPhone("201012345678")).toBe("01012345678");
  });

  it("returns the original input when no rule matches", () => {
    expect(formatDisplayPhone("+14155552671")).toBe("+14155552671");
  });

  it("round-trips with normalizeEgyptPhone", () => {
    expect(formatDisplayPhone(normalizeEgyptPhone("010 1234 5678"))).toBe("01012345678");
  });
});
