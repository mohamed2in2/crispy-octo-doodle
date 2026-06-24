import { normalizeEgyptPhone } from "./phone";
import { randomInt } from "crypto";

export class WhatsAppSendError extends Error {
  status?: number;
  errorPayload?: any;

  constructor(message: string, status?: number, errorPayload?: any) {
    super(message);
    this.name = "WhatsAppSendError";
    this.status = status;
    this.errorPayload = errorPayload;
  }
}

export function generateVerificationCode(): string {
  return String(100000 + randomInt(900000));
}

/**
 * Sends a WhatsApp OTP using Meta Business Cloud API with an Authentication template.
 * Throws a WhatsAppSendError on failure or non-2xx response.
 */
export async function sendOtpWhatsApp(phoneE164: string, code: string): Promise<boolean> {
  const token = process.env.WHATSAPP_PERMANENT_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v25.0";
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
  const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "ar_EG";

  if (!token || !phoneId || !templateName) {
    throw new WhatsAppSendError(
      "WhatsApp Business API credentials or template name not configured.",
      500
    );
  }

  let recipient: string;
  try {
    recipient = normalizeEgyptPhone(phoneE164).replace("+", "");
  } catch (err: any) {
    throw new WhatsAppSendError(`Phone normalization failed: ${err.message}`, 400);
  }

  const components = templateName === "3p_direct_integration_test_template"
    ? undefined
    : [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: code,
            },
          ],
        },
        {
          type: "button",
          index: "0",
          sub_type: "url",
          parameters: [
            {
              type: "text",
              text: code,
            },
          ],
        },
      ];

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: templateLang,
      },
      components,
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.error?.message || `HTTP ${res.status}`;
      throw new WhatsAppSendError(
        `Meta API error: ${errorMsg}`,
        res.status,
        data?.error || data
      );
    }

    return true;
  } catch (err: any) {
    if (err instanceof WhatsAppSendError) {
      throw err;
    }
    throw new WhatsAppSendError(`Network/connection failure: ${err.message}`, 500);
  }
}

/**
 * Orchestrator: Try to send via WhatsApp, and fall back to SMS on failure.
 * Returns which channel was used.
 */
export async function sendVerificationCode(
  phone: string,
  code: string
): Promise<{ channel: "whatsapp" | "sms" }> {
  try {
    await sendOtpWhatsApp(phone, code);
    return { channel: "whatsapp" };
  } catch (err: any) {
    // Log details server-side safely (no sensitive data in logs)
    console.error("WhatsApp delivery failed, falling back to SMS:", {
      message: err.message,
      status: err.status,
      // Error payload might contain developer details, log only basic info if needed
      errorPayload: err.errorPayload ? JSON.stringify(err.errorPayload).substring(0, 500) : undefined,
    });
    return { channel: "sms" };
  }
}
