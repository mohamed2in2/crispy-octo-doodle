import { afterEach, describe, expect, it, vi } from "vitest";

describe("production bypass flags", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it("rejects phone verification bypass in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.BYPASS_PHONE_VERIFICATION = "true";
    const { isPhoneVerificationBypassed } = await import("./aws-sms");
    expect(isPhoneVerificationBypassed()).toBe(false);
  });

  it("allows phone verification bypass only outside production", async () => {
    process.env.NODE_ENV = "development";
    process.env.BYPASS_PHONE_VERIFICATION = "true";
    const { isPhoneVerificationBypassed } = await import("./aws-sms");
    expect(isPhoneVerificationBypassed()).toBe(true);
  });
});
