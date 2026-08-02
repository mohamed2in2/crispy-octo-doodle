/**
 * Sha7nawy Payment Gateway SDK Service
 * Handles mobile wallet transactions for Egyptian carriers:
 * - Vodafone Cash (vf_cash) -> *9*1# prompt
 * - Orange Cash (or_cash)   -> Orange Cash App prompt
 * - Etisalat Cash (et_cash) -> e& Money App prompt
 */

export type Sha7nawyWalletMethod = "vf_cash" | "or_cash" | "et_cash";

export interface CreatePaymentParams {
  number: string;
  amount: number;
  method: Sha7nawyWalletMethod;
  client?: string;
  details?: string;
  webhook_url?: string;
}

export interface Sha7nawyPaymentData {
  id: number;
  amount: string;
  number: string;
  method: Sha7nawyWalletMethod;
  reference: string;
  status: string;
  client?: string;
  details?: string;
  transaction_id?: string;
  provider_transaction_id?: string;
  transaction_Time?: string;
  last_updated?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Sha7nawyCreateResponse {
  status: boolean;
  code: number;
  message: string;
  data?: Sha7nawyPaymentData;
  error?: string;
}

export const WALLET_METHOD_LABELS: Record<Sha7nawyWalletMethod, string> = {
  vf_cash: "فودافون كاش",
  or_cash: "أورنج كاش",
  et_cash: "اتصالات كاش (e& Money)",
};

export const WALLET_INSTRUCTIONS: Record<Sha7nawyWalletMethod, string> = {
  vf_cash: "اطلب *9*1# خلال دقيقة واحدة واكتب الرقم السري لتأكيد عملية الخصم",
  or_cash: "افتَح تطبيق Orange Cash واقبل طلب الدفع المعلق فوراً",
  et_cash: "افتَح تطبيق e& Money واقبل طلب الدفع المعلق فوراً",
};

/**
 * Validates an Egyptian mobile wallet phone number (11 digits starting with 01)
 */
export function validateEgyptianPhone(phone: string): boolean {
  const clean = phone.trim().replace(/\D/g, "");
  return /^01[0125]\d{8}$/.test(clean);
}

/**
 * Normalizes phone number to 11 digits format (e.g. 01234567890)
 */
export function normalizeEgyptianPhone(phone: string): string {
  let clean = phone.trim().replace(/\D/g, "");
  if (clean.startsWith("20")) {
    clean = clean.slice(2);
  }
  if (clean.startsWith("+20")) {
    clean = clean.slice(3);
  }
  return clean;
}

/**
 * Creates a mobile wallet payment request via Sha7nawy Gateway API
 */
export async function createSha7nawyPayment(
  params: CreatePaymentParams
): Promise<Sha7nawyCreateResponse> {
  const baseUrl = (process.env.SHA7NAWY_BASE_URL || "https://gate.sha7nawy.com").replace(/\/$/, "");
  const publicKey = process.env.SHA7NAWY_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("SHA7NAWY_PUBLIC_KEY is not configured in environment");
  }

  const cleanPhone = normalizeEgyptianPhone(params.number);
  if (!validateEgyptianPhone(cleanPhone)) {
    return {
      status: false,
      code: 400,
      message: "رقم المحفظة غير صحيح — يجب أن يكون رقم مصري مكون من 11 رقماً يبدأ بـ 01",
    };
  }

  if (!params.amount || params.amount < 5 || params.amount > 10000) {
    return {
      status: false,
      code: 400,
      message: "المبلغ غير مسموح به — الحد الأدنى 5 جنيه والحد الأقصى 10,000 جنيه",
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
        number: cleanPhone,
        amount: params.amount,
        method: params.method,
        client: params.client || "codeup-user",
        details: params.details || "Code-UP Balance Top-up",
        webhook_url: params.webhook_url,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        status: false,
        code: res.status,
        message: data.message || data.error || `خطأ من بوابة الدفع (${res.status})`,
      };
    }

    return {
      status: data.status ?? true,
      code: data.code ?? 200,
      message: data.message || WALLET_INSTRUCTIONS[params.method],
      data: data.data,
    };
  } catch (error: any) {
    console.error("[Sha7nawy API] Error calling create payment:", error);
    return {
      status: false,
      code: 500,
      message: "تعذر الاتصال ببوابة الدفع Sha7nawy — حاول مرة أخرى لاحقاً",
    };
  }
}

/**
 * Confirms a payment transaction using ref_code (Public Key Auth)
 * POST https://gate.sha7nawy.com/api/payment/confirm
 */
export async function confirmSha7nawyPayment(ref_code: string): Promise<Sha7nawyCreateResponse> {
  const baseUrl = (process.env.SHA7NAWY_BASE_URL || "https://gate.sha7nawy.com").replace(/\/$/, "");
  const publicKey = process.env.SHA7NAWY_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("SHA7NAWY_PUBLIC_KEY is not configured");
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
    console.error("[Sha7nawy API] Error calling confirm payment:", error);
    return { status: false, code: 500, message: "تعذر الاتصال بسيرفر Sha7nawy" };
  }
}

/**
 * Server-to-server payment verification (Secret Key Auth)
 * GET https://gate.sha7nawy.com/api/payment/info/{transaction_id}
 */
export async function getSha7nawyPaymentInfo(transaction_id: string | number): Promise<Sha7nawyCreateResponse> {
  const baseUrl = (process.env.SHA7NAWY_BASE_URL || "https://gate.sha7nawy.com").replace(/\/$/, "");
  const secretKey = process.env.SHA7NAWY_SECRET_KEY;

  if (!secretKey) {
    throw new Error("SHA7NAWY_SECRET_KEY is not configured");
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
    console.error("[Sha7nawy API] Error querying payment info:", error);
    return { status: false, code: 500, message: "تعذر الاستعلام من سيرفر Sha7nawy" };
  }
}
