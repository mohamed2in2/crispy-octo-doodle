import { getPaymentMethod } from "@/lib/payment-methods";
import { createSha7nawyPayment, type Sha7nawyCreateResponse } from "@/lib/sha7nawy";
import { createShakeOutPayment, type ShakeOutCreateResponse } from "@/lib/shakeout";

const FAWRY_METHOD_ID = "fawry";
const SHA7NAWY_WALLET_METHODS = new Set(["vf_cash", "et_cash", "or_cash"]);

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
  data?: unknown;
  error?: string;
}

export interface IPaymentProvider {
  name: string;
  createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult>;
}

export class ShakeOutPaymentProvider implements IPaymentProvider {
  name = "shakeout";

  async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
    if (params.method !== FAWRY_METHOD_ID) {
      return {
        success: false,
        code: 400,
        message: "بوابة Shake-Out مخصصة للدفع عبر فوري فقط",
        provider: "shakeout",
        error: "Shake-Out only supports Fawry",
      };
    }

    const res: ShakeOutCreateResponse = await createShakeOutPayment({
      amount: params.amount,
      method: FAWRY_METHOD_ID,
      number: "",
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
    if (!SHA7NAWY_WALLET_METHODS.has(params.method)) {
      return {
        success: false,
        code: 400,
        message: "بوابة Sha7nawy مخصصة لمحافظ فودافون كاش واتصالات كاش وأورانج كاش فقط",
        provider: "sha7nawy",
        error: "Sha7nawy only supports the configured mobile wallets",
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

  async createPayment(): Promise<UnifiedPaymentResult> {
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

  /** Routes only Fawry to Shake-Out and only the enabled mobile wallets to Sha7nawy. */
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
        provider: methodConfig.provider,
        error: "Payment method unavailable",
      };
    }

    if (methodConfig.provider === "shakeout" && params.method !== FAWRY_METHOD_ID) {
      return {
        success: false,
        code: 400,
        message: "بوابة Shake-Out مخصصة للدفع عبر فوري فقط",
        provider: "shakeout",
        error: "Invalid Shake-Out payment method",
      };
    }

    if (methodConfig.provider === "sha7nawy" && !SHA7NAWY_WALLET_METHODS.has(params.method)) {
      return {
        success: false,
        code: 400,
        message: "بوابة Sha7nawy مخصصة لمحافظ فودافون كاش واتصالات كاش وأورانج كاش فقط",
        provider: "sha7nawy",
        error: "Invalid Sha7nawy payment method",
      };
    }

    const provider = this.providers[methodConfig.provider];
    if (!provider) {
      return {
        success: false,
        code: 400,
        message: "طريقة الدفع غير متاحة عبر بوابة الدفع الحالية",
        provider: methodConfig.provider,
        error: "Unsupported provider",
      };
    }

    return provider.createPayment(params);
  }
}
