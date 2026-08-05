export function cleanBoundedText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export type LiveState = "live" | "upcoming" | "ended";
export function getLiveState(startsAt: Date, endsAt: Date, now = new Date()): LiveState {
  if (now < startsAt) return "upcoming";
  if (now > endsAt) return "ended";
  return "live";
}

export function subscriptionIsCurrent(expiresAt: Date | null, now = new Date()): boolean {
  return expiresAt === null || expiresAt > now;
}
