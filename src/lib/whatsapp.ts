import { randomInt } from "crypto";

import { sendVerificationSms } from "./aws-sms";
import { normalizeEgyptPhone } from "./phone";

type JsonRecord = Record<string, unknown>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown transport error";
}

function objectValue(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? value as JsonRecord : {};
}

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

export function generateVerificationCode(): string {
  return String(100000 + randomInt(900000));
}

/** Sends an OTP through Meta Business Cloud; callers may fall back to SMS. */
export async function sendOtpWhatsApp(phoneE164: string, code: string): Promise<boolean> {
  if (process.env.WHATSAPP_OFFLINE === "true") throw new WhatsAppSendError("WhatsApp is offline", 503);

  const token = process.env.WHATSAPP_PERMANENT_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v25.0";
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
  const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "ar_EG";
  const templateHasButton = process.env.WHATSAPP_TEMPLATE_HAS_BUTTON !== "false";
  if (!token || !phoneId || !templateName) throw new WhatsAppSendError("WhatsApp Business API is not configured", 500);

  let recipient: string;
  try {
    recipient = normalizeEgyptPhone(phoneE164).replace("+", "");
  } catch (error: unknown) {
    throw new WhatsAppSendError(`Phone normalization failed: ${errorMessage(error)}`, 400);
  }

  const paramName = process.env.WHATSAPP_PARAMETER_NAME || "";
  let components: JsonRecord[] | undefined;
  if (templateName !== "3p_direct_integration_test_template") {
    const bodyParameter: JsonRecord = { type: "text", text: code };
    if (paramName) bodyParameter.parameter_name = paramName;
    components = [{ type: "body", parameters: [bodyParameter] }];
    if (templateHasButton) {
      const buttonParameter: JsonRecord = { type: "text", text: code };
      if (paramName) buttonParameter.parameter_name = paramName;
      components.push({ type: "button", index: "0", sub_type: "url", parameters: [buttonParameter] });
    }
  }

  const payload = {
    messaging_product: "whatsapp", recipient_type: "individual", to: recipient, type: "template",
    template: { name: templateName, language: { code: templateLang }, components },
  };
  const url = ["https:/", "/graph.facebook.com/", version, "/", phoneId, "/messages"].join("");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const root = objectValue(data);
      const providerError = objectValue(root.error);
      const message = typeof providerError.message === "string" ? providerError.message : `HTTP ${response.status}`;
      throw new WhatsAppSendError(`Meta API error: ${message}`, response.status, data);
    }
    return true;
  } catch (error: unknown) {
    if (error instanceof WhatsAppSendError) throw error;
    throw new WhatsAppSendError(`Network/connection failure: ${errorMessage(error)}`, 500);
  }
}

/** Sends WhatsApp first, then falls back to SMS if the provider rejects it. */
export async function sendVerificationCode(phone: string, code: string, forceChannel?: "sms" | "whatsapp"): Promise<{ channel: "whatsapp" | "sms" }> {
  if (forceChannel === "sms") {
    await sendVerificationSms(phone, code);
    return { channel: "sms" };
  }
  try {
    await sendOtpWhatsApp(phone, code);
    return { channel: "whatsapp" };
  } catch (error: unknown) {
    const details = error instanceof WhatsAppSendError ? error : undefined;
    console.error("WhatsApp delivery failed; falling back to SMS", { message: errorMessage(error), status: details?.status });
    await sendVerificationSms(phone, code);
    return { channel: "sms" };
  }
}
