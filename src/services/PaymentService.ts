import { getPaymentMethod } from "@/lib/payment-methods";
import { createSha7nawyPayment, Sha7nawyCreateResponse } from "@/lib/sha7nawy";
import { createShakeOutPayment, ShakeOutCreateResponse } from "@/lib/shakeout";

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
  data?: any;
  error?: string;
}

export interface IPaymentProvider {
  name: string;
  createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult>;
}

export class ShakeOutPaymentProvider implements IPaymentProvider {
  name = "shakeout";

  async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
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
      data: res.data,
      error: res.error || (!res.status ? res.message : undefined),
    };
  }
}

export class Sha7nawyPaymentProvider implements IPaymentProvider {
  name = "sha7nawy";

  async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
    const res: Sha7nawyCreateResponse = await createSha7nawyPayment({
      amount: params.amount,
      method: params.method as any,
      number: params.number || "",
      client: params.client,
      details: params.details,
      webhook_url: params.webhook_url,
    });

    const methodConfig = getPaymentMethod(params.method);

    // Smart Fallback: If Sha7nawy returned a provider error (e.g. "خطأ لدى مزود الخدمة") or status false,
    // and Shake-Out API key is configured, fallback to Shake-Out vendor invoice so the user can still pay.
    if (!res.status && process.env.SHAKEOUT_PUBLIC_KEY) {
      console.warn(`[PaymentService] Sha7nawy failed (${res.message}). Attempting fallback to Shake-Out vendor invoice...`);
      try {
        const shakeout = new ShakeOutPaymentProvider();
        const fallbackRes = await shakeout.createPayment(params);
        if (fallbackRes.success) {
          return {
            ...fallbackRes,
            message: "تم تجهيز رابط الدفع الإلكتروني البديل (Shake-Out) لإتمام العملية بأمان.",
          };
        }
      } catch (err) {
        console.error("[PaymentService] Fallback to Shake-Out failed:", err);
      }
    }

    return {
      success: res.status,
      code: res.code,
      message: res.message,
      provider: "sha7nawy",
      reference: res.data?.reference || (res.data?.id ? String(res.data.id) : undefined),
      checkoutUrl: res.data?.payment_page_url || res.data?.url,
      instructions: methodConfig?.shortNote || res.message,
      data: res.data,
      error: res.error || (!res.status ? res.message : undefined),
    };
  }
}

export class InternalPaymentProvider implements IPaymentProvider {
  name = "internal";

  async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
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

  /**
   * Register or override a payment gateway provider for future expansion
   */
  public static registerProvider(name: string, provider: IPaymentProvider) {
    this.providers[name] = provider;
  }

  /**
   * Unified entry point: inspects method config to route to Shake-Out (Fawry), Sha7nawy (Wallets), or Internal
   */
  public static async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
    const methodConfig = getPaymentMethod(params.method);
    
    if (!methodConfig) {
      return {
        success: false,
        code: 400,
        message: "طريقة الدفع غير معروفة أو غير مدعومة",
        provider: "unknown",
        error: "Invalid payment method",
      };
    }

    if (!methodConfig.available) {
      return {
        success: false,
        code: 400,
        message: methodConfig.unavailableNote || `طريقة الدفع (${methodConfig.label}) غير متاحة حالياً.`,
        provider: methodConfig.provider as any,
        error: "Payment method unavailable",
      };
    }

    // Provider routing: Fawry uses Shake-Out; Wallets (vf_cash, et_cash) use Sha7nawy
    const providerKey = methodConfig.provider;
    const provider = this.providers[providerKey] || this.providers.sha7nawy;

    return provider.createPayment(params);
  }
}
