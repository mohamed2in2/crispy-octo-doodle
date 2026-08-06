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
  customerName?: string;
  customerEmail?: string;
  success_url?: string;
  fail_url?: string;
  pending_url?: string;
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
  invoice_id?: string;
  invoice_ref?: string;
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

export async function createShakeOutPayment(
  params: CreateShakeOutPaymentParams,
): Promise<ShakeOutCreateResponse> {
  const baseUrl = (process.env.SHAKEOUT_BASE_URL || "https://dash.shake-out.com").replace(/\/$/, "");
  const publicKey = process.env.SHAKEOUT_PUBLIC_KEY;

  if (!publicKey) {
    console.warn("[Shake-Out API] SHAKEOUT_PUBLIC_KEY is not configured in environment");
    return {
      status: false,
      code: 400,
      message: "مفتاح الربط مع Shake-Out غير مكتمل.",
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

  const endpoint = `${baseUrl}/api/public/vendor/invoice`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://code-up.tech").replace(/\/$/, "");
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const firstName = params.customerName?.trim().split(" ")[0] || "Student";
  const lastName = params.customerName?.trim().split(" ").slice(1).join(" ") || "User";
  const phone = params.number?.trim() ? params.number.trim() : "+201000000000";

  const payload = {
    amount: params.amount,
    currency: "EGP",
    due_date: dueDate,
    customer: {
      first_name: firstName,
      last_name: lastName,
      email: params.customerEmail || `student-${params.client || "guest"}@code-up.tech`,
      phone: phone.startsWith("+") ? phone : `+20${phone.replace(/^0+/, "")}`,
      address: "Cairo, Egypt",
    },
    redirection_urls: {
      success_url: params.success_url || `${appUrl}/account?payment=success`,
      fail_url: params.fail_url || `${appUrl}/account?payment=fail`,
      pending_url: params.pending_url || `${appUrl}/account?payment=pending`,
    },
    invoice_items: [
      {
        name: params.details || "شحن رصيد / شراء كورس على منصة Code-UP",
        price: params.amount,
        quantity: 1,
      },
    ],
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `apikey ${publicKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({} as Record<string, unknown>));

    if (!response.ok || data.status !== "success") {
      const errorMessage =
        (typeof data.message === "string" && data.message) ||
        (typeof data.error === "string" && data.error) ||
        `تعذر إنشاء فاتورة الدفع عبر Shake-Out (${response.status})`;
      return {
        status: false,
        code: response.status !== 200 ? response.status : 400,
        message: errorMessage,
      };
    }

    const payloadData = data.data as {
      url?: string;
      invoice_id?: string;
      invoice_ref?: string;
    } | undefined;
    const checkoutUrl = payloadData?.url;
    const invoiceId = payloadData?.invoice_id || "";
    const invoiceRef = payloadData?.invoice_ref || "";
    const combinedRef = invoiceId && invoiceRef ? `${invoiceId}/${invoiceRef}` : invoiceId || invoiceRef;
    const finalUrl = checkoutUrl || (combinedRef ? `https://dash.shake-out.com/invoice/${combinedRef}` : undefined);

    return {
      status: true,
      code: 200,
      message: (typeof data.message === "string" && data.message) || "تم إنشاء فاتورة الدفع بنجاح عبر Shake-Out",
      data: {
        id: invoiceId,
        amount: params.amount,
        method: params.method,
        reference: combinedRef,
        status: "pending",
        payment_page_url: finalUrl,
        url: finalUrl,
        invoice_id: invoiceId,
        invoice_ref: invoiceRef,
      },
    };
  } catch (error: unknown) {
    console.error("[Shake-Out API] Error creating vendor invoice:", error);
    return {
      status: false,
      code: 500,
      message: "تعذر الاتصال ببوابة Shake-Out — حاول مرة أخرى لاحقاً",
    };
  }
}

export async function getShakeOutInvoiceStatus(
  invoiceId: string,
  invoiceRef?: string,
): Promise<ShakeOutCreateResponse> {
  const baseUrl = (process.env.SHAKEOUT_BASE_URL || "https://dash.shake-out.com").replace(/\/$/, "");
  const publicKey = process.env.SHAKEOUT_PUBLIC_KEY;

  if (!publicKey) {
    return { status: false, code: 400, message: "مفتاح الربط مع Shake-Out غير مهيأ" };
  }

  const parts = (invoiceId || "").split("/");
  const id = parts[0] || invoiceId;
  const ref = invoiceRef || parts[1] || "";

  try {
    const url = ref ? `${baseUrl}/api/public/vendor/invoice-status/${id}/${ref}` : `${baseUrl}/api/public/vendor/invoice-status/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `apikey ${publicKey}`,
      },
    });

    const data = await response.json().catch(() => ({} as Record<string, unknown>));
    const invoiceData = (data.data as Record<string, unknown> | undefined) || {};

    return {
      status: data.status === "success",
      code: response.status,
      message: (typeof data.message === "string" && data.message) || "تم استعلام الفاتورة بنجاح",
      data: {
        id: (invoiceData.invoice_id as string | undefined) || id,
        amount: (invoiceData.amount as string | number | undefined) ?? "0",
        method: (invoiceData.payment_method as string | undefined) || "card",
        reference: (invoiceData.invoice_id as string | undefined) || id,
        status: (invoiceData.invoice_status as string | undefined) || "unknown",
        invoice_id: invoiceData.invoice_id as string | undefined,
        invoice_ref: invoiceData.invoice_ref as string | undefined,
      },
    };
  } catch (error: unknown) {
    console.error("[Shake-Out API] Error checking invoice status:", error);
    return { status: false, code: 500, message: "تعذر الاستعلام من سيرفر Shake-Out" };
  }
}

export const getShakeOutPaymentInfo = getShakeOutInvoiceStatus;
