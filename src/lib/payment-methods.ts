/**
 * Centralized Payment Methods Configuration
 *
 * Single source of truth for every payment method exposed by the platform's
 * payment provider (Shake-Out / sha7nawy). The frontend renders its payment
 * method cards from PAYMENT_METHODS and all server-side validation resolves
 * methods through getPaymentMethod().
 *
 * Only methods actually supported by the gateway belong here. Shake-Out
 * currently supports Egyptian mobile wallets only (verified against its API
 * and public documentation) — Vodafone Cash, Etisalat Cash (e& Money), and
 * Orange Cash (marked unavailable while under provider maintenance).
 *
 * Adding a future method (e.g. Fawry reference payment, Meeza, bank cards)
 * means adding ONE object to PAYMENT_METHODS — no UI or route changes:
 * - needsPhone=false   -> the wizard skips the phone step
 * - requiresReference  -> the instructions step shows the reference number
 * - category="branch"  -> used for "pay at a branch" instruction styling
 */

export type PaymentMethodCategory = "wallet" | "card" | "branch";

export interface PaymentMethodConfig {
  /** Gateway method identifier sent to the Shake-Out API. */
  id: string;
  /** Arabic display name (UI is RTL Arabic-first). */
  label: string;
  /** Latin display name for secondary caption. */
  labelEn: string;
  /** One-line description shown on the method card. */
  description: string;
  /** Grouping used for layout/future filtering. */
  category: PaymentMethodCategory;
  /** Brand color used for icon background & accents. */
  brandColor: string;
  /** Foreground color readable on brandColor. */
  brandForeground: string;
  /** Two-letter monogram rendered when no logo asset is available. */
  monogram: string;
  /** True when this method requires the payer's wallet phone number. */
  needsPhone: boolean;
  /** True when paying requires acting on a reference/PIN (shown on instructions step). */
  requiresReference: boolean;
  /** False = shown greyed-out with unavailableNote, and rejected server-side. */
  available: boolean;
  /** Why the method is unavailable (shown on card + validation errors). */
  unavailableNote?: string;
  /** Human-readable confirmation speed for the user. */
  processingSpeed: string;
  /** Compact one-line note used as API messages / legacy instruction text. */
  shortNote: string;
  /** Step-by-step Arabic instructions rendered on the instructions step. */
  instructions: string[];
}

export const PAYMENT_METHODS: readonly PaymentMethodConfig[] = [
  {
    id: "vf_cash",
    label: "فودافون كاش",
    labelEn: "Vodafone Cash",
    description: "ادفع فوراً من محفظة فودافون كاش عبر طلب دفع على هاتفك.",
    category: "wallet",
    brandColor: "#E60000",
    brandForeground: "#FFFFFF",
    monogram: "VF",
    needsPhone: true,
    requiresReference: false,
    available: true,
    processingSpeed: "تأكيد فوري",
    shortNote: "اطلب *9*1# خلال دقيقة واحدة واكتب الرقم السري لتأكيد عملية الخصم",
    instructions: [
      "سيصلك إشعار بطلب الدفع على رقم محفظتك خلال ثوانٍ.",
      "اطلب *9*1# من هاتفك خلال دقيقة واحدة.",
      "اختر «الموافقة على طلب الدفع» وأدخل الرقم السري للمحفظة.",
      "سيتم شحن رصيدك تلقائياً فور تأكيد الدفع — لا حاجة للضغط على أي زر.",
    ],
  },
  {
    id: "et_cash",
    label: "اتصالات كاش (e& Money)",
    labelEn: "Etisalat Cash / e& Money",
    description: "ادفع فوراً من محفظة اتصالات كاش / تطبيق e& Money.",
    category: "wallet",
    brandColor: "#76B900",
    brandForeground: "#0B1F00",
    monogram: "e&",
    needsPhone: true,
    requiresReference: false,
    available: true,
    processingSpeed: "تأكيد فوري",
    shortNote: "افتَح تطبيق e& Money واقبل طلب الدفع المعلق فوراً",
    instructions: [
      "سيصلك إشعار بطلب الدفع المعلق على محفظتك خلال ثوانٍ.",
      "افتح تطبيق e& Money أو محفظة اتصالات كاش.",
      "اقبل طلب الدفع المعلق وأكد بالرقم السري.",
      "سيتم شحن رصيدك تلقائياً فور تأكيد الدفع — لا حاجة للضغط على أي زر.",
    ],
  },
  {
    id: "or_cash",
    label: "أورانج كاش",
    labelEn: "Orange Cash",
    description: "محفظة أورانج كاش — غير متاحة مؤقتاً.",
    category: "wallet",
    brandColor: "#FF7900",
    brandForeground: "#FFFFFF",
    monogram: "OR",
    needsPhone: true,
    requiresReference: false,
    available: false,
    unavailableNote:
      "محفظة أورانج كاش تحت الصيانة والتطوير حالياً لتقديم خدمة أفضل. يرجى اختيار فودافون كاش أو اتصالات كاش لإتمام عملية الدفع بسهولة دون قلق.",
    processingSpeed: "غير متاحة حالياً",
    shortNote:
      "محفظة أورانج كاش تحت الصيانة والتطوير حالياً — يرجى اختيار فودافون كاش أو اتصالات كاش لإتمام الدفع بسهولة.",
    instructions: [],
  },
];

/** Resolve a gateway method id to its config, or null when unknown. */
export function getPaymentMethod(id: string): PaymentMethodConfig | null {
  return PAYMENT_METHODS.find((m) => m.id === id) ?? null;
}

/** All methods for the UI; unavailable ones are included but greyed out. */
export function listPaymentMethods(): readonly PaymentMethodConfig[] {
  return PAYMENT_METHODS;
}

/** Only methods the user can actually pay with right now. */
export function listAvailablePaymentMethods(): PaymentMethodConfig[] {
  return PAYMENT_METHODS.filter((m) => m.available);
}
