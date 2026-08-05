/** Server-side reCAPTCHA Enterprise assessment validation. */

const PROJECT_ID = "codeup-ef28b";
const production = process.env.NODE_ENV === "production";
const configuredSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export interface RecaptchaResult {
  success: boolean;
  score: number;
  reasons: string[];
  assessmentName?: string;
}

type AssessmentResponse = {
  error?: unknown;
  name?: string;
  tokenProperties?: { valid?: boolean; action?: string; invalidReason?: string };
  riskAnalysis?: { score?: number; reasons?: string[] };
};

function unavailable(reason: string): RecaptchaResult {
  // A production authentication endpoint must not silently lose its bot control.
  return { success: !production, score: production ? 0 : 1, reasons: [reason] };
}

export async function verifyRecaptchaToken(token: string, expectedAction: string, scoreThreshold = 0.5): Promise<RecaptchaResult> {
  if (!production && process.env.RECAPTCHA_BYPASS === "true") {
    return { success: true, score: 1, reasons: ["DEV_BYPASS"] };
  }
  if (!token) return unavailable("MISSING_TOKEN");

  const apiKey = process.env.RECAPTCHA_API_KEY;
  if (!apiKey || !configuredSiteKey) {
    console.error("[reCAPTCHA] API key or site key is not configured.");
    return unavailable("NOT_CONFIGURED");
  }

  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${encodeURIComponent(apiKey)}`;
  let data: AssessmentResponse;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: { token, expectedAction, siteKey: configuredSiteKey } }),
    });
    data = (await response.json()) as AssessmentResponse;
  } catch (error) {
    console.error("[reCAPTCHA] Assessment request failed:", error);
    return unavailable("NETWORK_ERROR");
  }

  if (data.error) {
    console.error("[reCAPTCHA] Assessment API returned an error.");
    return { success: false, score: 0, reasons: ["API_ERROR"] };
  }

  const tokenProperties = data.tokenProperties ?? {};
  const riskAnalysis = data.riskAnalysis ?? {};
  const score = riskAnalysis.score ?? 0;
  const reasons = riskAnalysis.reasons ?? [];
  if (!tokenProperties.valid) {
    return { success: false, score: 0, reasons: ["INVALID_TOKEN", ...(tokenProperties.invalidReason ? [tokenProperties.invalidReason] : []), ...reasons] };
  }
  if (tokenProperties.action !== expectedAction) {
    return { success: false, score, reasons: ["ACTION_MISMATCH", ...reasons] };
  }
  return { success: score >= scoreThreshold, score, reasons, assessmentName: data.name };
}
