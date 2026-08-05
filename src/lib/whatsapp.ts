import { randomInt } from "crypto";
import { sendVerificationSms } from "./aws-sms";
import { normalizeEgyptPhone } from "./phone";

export class WhatsAppSendError extends Error {
  status?: number;
  errorPayload?: unknown;

  constructor(message: string, status?: number, errorPayload?: unknown) {
    super(message);
    this.name = "WhatsAppSendError";
    this.status = status;
    this.errorPayload = errorPayload;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function providerMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = "error" in payload ? payload.error : undefined;
  if (!error || typeof error !== "object" || !("message" in error)) return fallback;
  return typeof error.message === "string" ? error.message : fallback;
}

export function generateVerificationCode(): string {
  return String(100000 + randomInt(900000));
}

/**
 * Sends a WhatsApp OTP using Meta Business Cloud API with an Authentication template.
 * Throws a WhatsAppSendError on failure or non-2xx response.
 */
export async function sendOtpWhatsApp(phoneE164: string, code: string): Promise<boolean> {
  if (process.env.WHATSAPP_OFFLINE === "true") {
    throw new WhatsAppSendError("WhatsApp is offline (WHATSAPP_OFFLINE=true)", 503);
  }

  const token = process.env.WHATSAPP_PERMANENT_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v25.0";
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
  const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "ar_EG";
  const templateHasButton = process.env.WHATSAPP_TEMPLATE_HAS_BUTTON !== "false";

  if (!token || !phoneId || !templateName) {
    throw new WhatsAppSendError(
      "WhatsApp Business API credentials or template name not configured.",
      500
    );
  }

  let recipient: string;
  try {
    recipient = normalizeEgyptPhone(phoneE164).replace("+", "");
  } catch (error: unknown) {
    throw new WhatsAppSendError(`Phone normalization failed: ${errorMessage(error, "invalid number")}`, 400);
  }

  let components: object[] | undefined;
  const paramName = process.env.WHATSAPP_PARAMETER_NAME || "";

  if (templateName === "3p_direct_integration_test_template") {
    components = undefined;
  } else {
    const bodyParam: Record<string, string> = { type: "text", text: code };
    if (paramName) bodyParam.parameter_name = paramName;

    const bodyComponents: object[] = [
      {
        type: "body",
        parameters: [bodyParam],
      },
    ];

    if (templateHasButton) {
      const buttonParam: Record<string, string> = { type: "text", text: code };
      if (paramName) buttonParam.parameter_name = paramName;
      bodyComponents.push({
        type: "button",
        index: "0",
        sub_type: "url",
        parameters: [buttonParam],
      });
    }

    components = bodyComponents;
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLang },
      components,
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: unknown = await res.json().catch(() => undefined);
    if (!res.ok) {
      throw new WhatsAppSendError(
        `Meta API error: ${providerMessage(data, `HTTP ${res.status}`)}`,
        res.status,
        data
      );
    }

    return true;
  } catch (error: unknown) {
    if (error instanceof WhatsAppSendError) throw error;
    throw new WhatsAppSendError(`Network/connection failure: ${errorMessage(error, "unknown error")}`, 500);
  }
}

/**
 * Tries WhatsApp first and falls back to SMS. Returns the channel that was used.
 */
export async function sendVerificationCode(
  phone: string,
  code: string,
  forceChannel?: "sms" | "whatsapp"
): Promise<{ channel: "whatsapp" | "sms" }> {
  if (forceChannel === "sms") {
    await sendVerificationSms(phone, code);
    return { channel: "sms" };
  }

  try {
    await sendOtpWhatsApp(phone, code);
    return { channel: "whatsapp" };
  } catch (error: unknown) {
    const status = error instanceof WhatsAppSendError ? error.status : undefined;
    console.error("WhatsApp delivery failed; falling back to SMS", { status });
    await sendVerificationSms(phone, code);
    return { channel: "sms" };
  }
}
