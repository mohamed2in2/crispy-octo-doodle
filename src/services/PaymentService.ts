import { getPaymentMethod } from "@/lib/payment-methods";
import { createSha7nawyPayment, type Sha7nawyCreateResponse } from "@/lib/sha7nawy";
import { createShakeOutPayment, type ShakeOutCreateResponse } from "@/lib/shakeout";

/** Shake-Out may only process Fawry. */
export const SHAKEOUT_METHODS = new Set(["fawry"]);

/** Sha7nawy may only process these mobile wallets. */
export const SHA7NAWY_METHODS = new Set(["vf_cash", "et_cash", "or_cash"]);

export interface UnifiedPaymentParams {
  method: string;
  amount: number;
  number?: string;
  client?: string;
  details?: string;
  customerName?: string;
  customerEmail?: string;
  success_url?: string;
  fail_url?: string;
  pending_url?: string;
  webhook_url?: string;
}

export interface UnifiedPaymentResult {
  success: boolean;
  code: number;
  message: string;
  provider: "shakeout" | "sha7nawy" | "internal" | "bank" | "unknown";
  reference?: string;
  checkoutUrl?: string;
  instructions?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface IPaymentProvider {
  name: string;
  createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult>;
}

export function assertMethodProviderSeparation(methodId: string): {
  ok: true;
  provider: "shakeout" | "sha7nawy" | "internal" | "bank";
} | { ok: false; message: string } {
  const methodConfig = getPaymentMethod(methodId);
  if (!methodConfig) {
    return { ok: false, message: "طريقة الدفع غير معروفة أو غير مدعومة" };
  }
  if (!methodConfig.available) {
    return {
      ok: false,
      message:
        methodConfig.unavailableNote ||
        `طريقة الدفع (${methodConfig.label}) غير متاحة حالياً.`,
    };
  }

  // Hard provider locks — never trust config alone for routing safety.
  if (methodId === "we_pay" || methodId === "instapay" || methodId === "bank_card" || methodId === "meeza") {
    return { ok: false, message: "طريقة الدفع غير مدعومة" };
  }

  if (methodConfig.provider === "shakeout") {
    if (!SHAKEOUT_METHODS.has(methodId)) {
      return {
        ok: false,
        message: "Shake-Out يدعم فوري فقط. لا يمكن توجيه هذه الطريقة عبر Shake-Out.",
      };
    }
    return { ok: true, provider: "shakeout" };
  }

  if (methodConfig.provider === "sha7nawy") {
    if (!SHA7NAWY_METHODS.has(methodId)) {
      return {
        ok: false,
        message:
          "Sha7nawy يدعم فودافون كاش واتصالات كاش وأورانج كاش فقط.",
      };
    }
    return { ok: true, provider: "sha7nawy" };
  }

  if (methodConfig.provider === "internal" || methodConfig.provider === "bank") {
    return { ok: true, provider: methodConfig.provider };
  }

  return { ok: false, message: "مزود الدفع غير مدعوم" };
}

export class ShakeOutPaymentProvider implements IPaymentProvider {
  name = "shakeout";

  async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
    if (!SHAKEOUT_METHODS.has(params.method)) {
      return {
        success: false,
        code: 400,
        message: "Shake-Out يدعم فوري فقط",
        provider: "shakeout",
        error: "Method not allowed on Shake-Out",
      };
    }

    const res: ShakeOutCreateResponse = await createShakeOutPayment({
      amount: params.amount,
      method: params.method,
      number: params.number,
      client: params.client,
      details: params.details,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      success_url: params.success_url,
      fail_url: params.fail_url,
      pending_url: params.pending_url,
      webhook_url: params.webhook_url,
    });

    return {
      success: res.status,
      code: res.code,
      message: res.message,
      provider: "shakeout",
      reference: res.data?.reference || res.data?.invoice_id,
      checkoutUrl: res.data?.payment_page_url || res.data?.url,
      data: res.data as Record<string, unknown> | undefined,
      error: res.error || (!res.status ? res.message : undefined),
    };
  }
}

export class Sha7nawyPaymentProvider implements IPaymentProvider {
  name = "sha7nawy";

  async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
    if (!SHA7NAWY_METHODS.has(params.method)) {
      return {
        success: false,
        code: 400,
        message: "Sha7nawy يدعم المحافظ المصرح بها فقط",
        provider: "sha7nawy",
        error: "Method not allowed on Sha7nawy",
      };
    }

    const res: Sha7nawyCreateResponse = await createSha7nawyPayment({
      amount: params.amount,
      method: params.method,
      number: params.number || "",
      client: params.client,
      details: params.details,
      webhook_url: params.webhook_url,
    });

    const methodConfig = getPaymentMethod(params.method);

    // IMPORTANT: never silently fall back from Sha7nawy to Shake-Out.
    // A failed wallet charge must fail closed so money routing stays auditable.

    return {
      success: res.status,
      code: res.code,
      message: res.message,
      provider: "sha7nawy",
      reference:
        res.data?.reference ||
        (res.data?.id ? String(res.data.id) : undefined),
      checkoutUrl: res.data?.payment_page_url || res.data?.url,
      instructions: methodConfig?.shortNote || res.message,
      data: res.data as Record<string, unknown> | undefined,
      error: res.error || (!res.status ? res.message : undefined),
    };
  }
}

export class InternalPaymentProvider implements IPaymentProvider {
  name = "internal";

  async createPayment(_params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
    return {
      success: true,
      code: 200,
      message: "تم اختيار الدفع الداخلي بنجاح",
      provider: "internal",
      reference: `int_${Date.now()}`,
    };
  }
}

export class PaymentService {
  private static providers: Record<string, IPaymentProvider> = {
    shakeout: new ShakeOutPaymentProvider(),
    sha7nawy: new Sha7nawyPaymentProvider(),
    internal: new InternalPaymentProvider(),
  };

  public static registerProvider(name: string, provider: IPaymentProvider) {
    this.providers[name] = provider;
  }

  public static async createPayment(
    params: UnifiedPaymentParams,
  ): Promise<UnifiedPaymentResult> {
    const gate = assertMethodProviderSeparation(params.method);
    if (!gate.ok) {
      return {
        success: false,
        code: 400,
        message: gate.message,
        provider: "unknown",
        error: gate.message,
      };
    }

    const provider = this.providers[gate.provider];
    if (!provider) {
      return {
        success: false,
        code: 400,
        message: "مزود الدفع غير مهيأ",
        provider: "unknown",
        error: "Provider missing",
      };
    }

    return provider.createPayment(params);
  }
}
