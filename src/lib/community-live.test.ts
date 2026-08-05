import { describe, expect, it } from "vitest";
import { cleanBoundedText, getLiveState, isValidHttpUrl, subscriptionIsCurrent } from "./community-live";

describe("community/live validation", () => {
  it("accepts only http(s) join URLs", () => {
    expect(isValidHttpUrl("https://meet.example.com/room")).toBe(true);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("not-a-url")).toBe(false);
  });
  it("bounds and trims text", () => expect(cleanBoundedText("  hello world  ", 5)).toBe("hello"));
  it("classifies session time", () => {
    const now = new Date("2026-08-05T18:00:00Z");
    expect(getLiveState(new Date("2026-08-05T17:00:00Z"), new Date("2026-08-05T19:00:00Z"), now)).toBe("live");
    expect(getLiveState(new Date("2026-08-05T20:00:00Z"), new Date("2026-08-05T21:00:00Z"), now)).toBe("upcoming");
    expect(getLiveState(new Date("2026-08-05T15:00:00Z"), new Date("2026-08-05T16:00:00Z"), now)).toBe("ended");
  });
  it("honours subscription expiry", () => {
    const now = new Date("2026-08-05T18:00:00Z");
    expect(subscriptionIsCurrent(null, now)).toBe(true);
    expect(subscriptionIsCurrent(new Date("2026-08-06T18:00:00Z"), now)).toBe(true);
    expect(subscriptionIsCurrent(new Date("2026-08-04T18:00:00Z"), now)).toBe(false);
  });
});
