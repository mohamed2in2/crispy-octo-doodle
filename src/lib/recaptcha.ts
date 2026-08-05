/** Server-side reCAPTCHA Enterprise assessment. */
const PROJECT_ID = "codeup-ef28b";

type AssessmentResponse = {
  name?: string;
  error?: unknown;
  tokenProperties?: { valid?: boolean; action?: string; invalidReason?: string };
  riskAnalysis?: { score?: number; reasons?: string[] };
};

export interface RecaptchaResult {
  success: boolean;
  score: number;
  reasons: string[];
  assessmentName?: string;
}

function bypassAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.RECAPTCHA_BYPASS === "true";
}

function unavailable(reason: string): RecaptchaResult {
  if (process.env.NODE_ENV === "production") return { success: false, score: 0, reasons: [reason] };
  return { success: true, score: 1, reasons: [reason] };
}

export async function verifyRecaptchaToken(token: string, expectedAction: string, scoreThreshold = 0.5): Promise<RecaptchaResult> {
  if (bypassAllowed()) return { success: true, score: 1, reasons: ["NON_PRODUCTION_BYPASS"] };

  const apiKey = process.env.RECAPTCHA_API_KEY;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!apiKey || !siteKey) {
    console.error("reCAPTCHA is not configured");
    return unavailable("CONFIGURATION_ERROR");
  }
  if (!token || !expectedAction) return { success: false, score: 0, reasons: ["MISSING_TOKEN_OR_ACTION"] };

  const url = ["https:/", `/recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=`, encodeURIComponent(apiKey)].join("");
  let data: AssessmentResponse;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: { token, expectedAction, siteKey } }),
      signal: AbortSignal.timeout(10_000),
    });
    data = await response.json() as AssessmentResponse;
    if (!response.ok) {
      console.error("reCAPTCHA assessment request failed", { status: response.status });
      return unavailable("ASSESSMENT_REQUEST_ERROR");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown reCAPTCHA network error";
    console.error("reCAPTCHA assessment unavailable", { message });
    return unavailable("NETWORK_ERROR");
  }

  if (data.error) return { success: false, score: 0, reasons: ["API_ERROR"] };
  const tokenProperties = data.tokenProperties ?? {};
  const riskAnalysis = data.riskAnalysis ?? {};
  const score = typeof riskAnalysis.score === "number" ? riskAnalysis.score : 0;
  const reasons = Array.isArray(riskAnalysis.reasons) ? riskAnalysis.reasons : [];

  if (!tokenProperties.valid) {
    return { success: false, score: 0, reasons: ["INVALID_TOKEN", ...(tokenProperties.invalidReason ? [tokenProperties.invalidReason] : []), ...reasons] };
  }
  if (tokenProperties.action !== expectedAction) return { success: false, score, reasons: ["ACTION_MISMATCH", ...reasons] };
  return { success: score >= scoreThreshold, score, reasons, assessmentName: data.name };
}
