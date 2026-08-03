/**
 * Shake-Out Payment Gateway SDK Service (https://dash.shake-out.com)
 * Handles transactions and integrations for the Shake-Out payment provider.
 */

import { getPaymentMethod } from "./payment-methods";

export interface CreateShakeOutPaymentParams {
  number?: string;
  amount: number;
  method: string;
  client?: string;
  details?: string;
  webhook_url?: string;
}

export interface ShakeOutPaymentData {
  id: number | string;
  amount: string | number;
  number?: string;
  method: string;
  reference: string;
  status: string;
  client?: string;
  details?: string;
  transaction_id?: string;
  provider_transaction_id?: string;
  transaction_Time?: string;
  created_at?: string;
  payment_page_url?: string;
  url?: string;
}

export interface ShakeOutCreateResponse {
  status: boolean;
  code: number;
  message: string;
  data?: ShakeOutPaymentData;
  error?: string;
}

export const SHAKEOUT_PENDING_TYPE = "credit_shakeout_pending";
export const SHAKEOUT_CREDITED_TYPE = "credit_shakeout_wallet";

export function shakeOutRefNote(reference: string): string {
  return `shakeout_ref:${reference}`;
}

/**
 * Creates a payment transaction with Shake-Out API
 */
export async function createShakeOutPayment(
  params: CreateShakeOutPaymentParams
): Promise<ShakeOutCreateResponse> {
  const baseUrl = (process.env.SHAKEOUT_BASE_URL || "https://dash.shake-out.com").replace(/\/$/, "");
  const publicKey = process.env.SHAKEOUT_PUBLIC_KEY;

  if (!publicKey) {
    console.warn("[Shake-Out API] SHAKEOUT_PUBLIC_KEY is not configured in environment");
    return {
      status: false,
      code: 400,
      message: "بوابة Shake-Out (dash.shake-out.com) قيد التفعيل. يرجى تجربة فودافون كاش أو اتصالات كاش عبر Sha7nawy.",
    };
  }

  const methodConfig = getPaymentMethod(params.method);
  if (methodConfig && !methodConfig.available) {
    return {
      status: false,
      code: 400,
      message: methodConfig.unavailableNote || `طريقة الدفع (${methodConfig.label}) غير متاحة حالياً.`,
    };
  }

  const endpoint = `${baseUrl}/api/payment/create`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": publicKey,
      },
      body: JSON.stringify({
        number: (params.number && params.number.trim()) ? params.number.trim() : "01000000000",
        amount: params.amount,
        method: params.method,
        client: params.client || "codeup-user",
        details: params.details || "Code-UP Balance Top-up via Shake-Out",
        webhook_url: params.webhook_url,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        status: false,
        code: res.status,
        message: data.message || data.error || `تعذر بدء عملية الدفع عبر Shake-Out (${res.status})`,
      };
    }

    return {
      status: data.status ?? true,
      code: data.code ?? 200,
      message: data.message || methodConfig?.shortNote || "تم إنشاء طلب الدفع بنجاح عبر Shake-Out",
      data: data.data,
    };
  } catch (error: any) {
    console.error("[Shake-Out API] Error calling create payment:", error);
    return {
      status: false,
      code: 500,
      message: "تعذر الاتصال ببوابة Shake-Out — حاول مرة أخرى لاحقاً",
    };
  }
}

/**
 * Confirms a Shake-Out payment using reference code
 */
export async function confirmShakeOutPayment(ref_code: string): Promise<ShakeOutCreateResponse> {
  const baseUrl = (process.env.SHAKEOUT_BASE_URL || "https://dash.shake-out.com").replace(/\/$/, "");
  const publicKey = process.env.SHAKEOUT_PUBLIC_KEY;

  if (!publicKey) {
    return { status: false, code: 400, message: "مفتاح الربط مع Shake-Out غير مهيأ" };
  }

  try {
    const res = await fetch(`${baseUrl}/api/payment/confirm`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": publicKey,
      },
      body: JSON.stringify({ ref_code }),
    });

    const data = await res.json().catch(() => ({}));
    return {
      status: data.status ?? res.ok,
      code: data.code ?? res.status,
      message: data.message || (res.ok ? "تم التأكيد بنجاح" : "تعذر التأكيد"),
      data: data.data,
    };
  } catch (error: any) {
    console.error("[Shake-Out API] Error calling confirm payment:", error);
    return { status: false, code: 500, message: "تعذر الاتصال بسيرفر التأكيد" };
  }
}

/**
 * Server-to-server payment verification (Secret Key Auth) for Shake-Out
 */
export async function getShakeOutPaymentInfo(transaction_id: string | number): Promise<ShakeOutCreateResponse> {
  const baseUrl = (process.env.SHAKEOUT_BASE_URL || "https://dash.shake-out.com").replace(/\/$/, "");
  const secretKey = process.env.SHAKEOUT_SECRET_KEY;

  if (!secretKey) {
    return { status: false, code: 400, message: "مفتاح الاستعلام مع Shake-Out غير مهيأ" };
  }

  try {
    const res = await fetch(`${baseUrl}/api/payment/info/${transaction_id}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": secretKey,
      },
    });

    const data = await res.json().catch(() => ({}));
    return {
      status: data.status ?? res.ok,
      code: data.code ?? res.status,
      message: data.message || "تم استعلام البيانات بنجاح",
      data: data.data,
    };
  } catch (error: any) {
    console.error("[Shake-Out API] Error querying payment info:", error);
    return { status: false, code: 500, message: "تعذر الاستعلام من سيرفر التأكيد" };
  }
}
