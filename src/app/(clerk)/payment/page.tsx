"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  listPaymentMethods,
  getPaymentMethod,
  type PaymentMethodConfig,
} from "@/lib/payment-methods";
import { validateEgyptianPhone, normalizeEgyptianPhone } from "@/lib/sha7nawy";
import { PaymentMethodGrid } from "@/components/payment/PaymentMethodGrid";
import { PaymentProviderIcon } from "@/components/payment/PaymentProviderIcon";
import { LoadingState } from "@/components/payment/LoadingState";
import { ErrorState } from "@/components/payment/ErrorState";
import { PaymentStatus } from "@/components/payment/PaymentStatus";

/* ─── Step type ─────────────────────────────────────────────────────────── */
type Step = "amount" | "method" | "phone" | "instructions" | "status" | "success" | "error";

/* ─── PaymentIntent (returned by POST /create) ───────────────────────────── */
interface PaymentIntent {
  reference: string;
  method: string;
  totalAmount: number;
  instructions: string;
  /** Gateway transaction id for status polling */
  transactionId?: string | number;
  /** External payment page URL (if provided by gateway — rarely used) */
  paymentPageUrl?: string;
}

/* ─── Amount presets ─────────────────────────────────────────────────────── */
const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

/* ─── ────────────────────────────────────────────────────────────────────── */

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  /* read URL params */
  const amountParam = searchParams.get("amount");
  const methodParam = searchParams.get("method");
  const returnHref = searchParams.get("return");
  const contextLabel = searchParams.get("context") ?? "";

  /* ─── state ────────────────────────────────────────────────────────────── */
  const [step, setStep] = useState<Step>("amount");
  const [baseAmount, setBaseAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const allMethods = listPaymentMethods();
  const methods = allMethods.filter((m) => m.available);
  const selectedMethod = selectedMethodId ? getPaymentMethod(selectedMethodId) : null;

  /* ─── initialise: prefill amount & method from URL ─────────────────────── */
  useEffect(() => {
    const amt = Number(amountParam);
    if (amt > 0) {
      setBaseAmount(String(amt));
    }
    if (methodParam) {
      const found = getPaymentMethod(methodParam);
      if (found && found.available) {
        setSelectedMethodId(found.id);
        if (amt > 0) {
          setStep(found.needsPhone ? "phone" : "method");
        }
      }
    }
  }, [amountParam, methodParam]);

  /* ─── helpers ──────────────────────────────────────────────────────────── */
  const validatePhone = useCallback((val: string) => {
    if (!val.trim()) {
      setPhoneError("رقم المحفظة مطلوب");
      return false;
    }
    if (!validateEgyptianPhone(val)) {
      setPhoneError("رقم المحفظة غير صحيح — يجب أن يكون 11 رقماً يبدأ بـ 01");
      return false;
    }
    setPhoneError("");
    return true;
  }, []);

  /* ─── step: amount → method ────────────────────────────────────────────── */
  const handleAmountContinue = () => {
    const amt = Number(baseAmount);
    if (!amt || amt < 5) {
      toastError("المبلغ يجب أن يكون 5 جنيه على الأقل");
      return;
    }
    if (amt > 10000) {
      toastError("الحد الأقصى للشحن 10,000 جنيه");
      return;
    }
    setStep("method");
  };

  /* ─── step: method → phone (or skip to create) ─────────────────────────── */
  const handleMethodContinue = () => {
    if (!selectedMethod) {
      toastError("اختر طريقة الدفع أولاً");
      return;
    }
    if (selectedMethod.needsPhone) {
      setStep("phone");
    } else {
      // future-providers that don't need phone skip straight to create
      handleCreatePayment();
    }
  };

  /* ─── create payment intent ────────────────────────────────────────────── */
  const handleCreatePayment = async () => {
    if (!selectedMethod) return;
    const amt = Number(baseAmount);
    if (!amt || amt < 5) return;

    setIsCreating(true);
    setErrors([]);

    try {
      const normalize = normalizeEgyptianPhone(phone || "0");
      const res = await fetch("/api/payments/sha7nawy/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: normalize,
          amount: amt,
          method: selectedMethod.id,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        setErrors([body.error || "تعذر بدء عملية الدفع"]);
        setStep("error");
        setIsCreating(false);
        return;
      }

      setIntent({
        reference: body.reference,
        method: body.method,
        totalAmount: body.totalAmount,
        instructions: body.instructions,
        transactionId: body.data?.transaction_id ?? body.data?.id,
        paymentPageUrl: body.data?.payment_page_url ?? body.data?.url ?? undefined,
      });

      setStep(selectedMethod.requiresReference ? "instructions" : "instructions");
    } catch {
      setErrors(["حدث خطأ أثناء الاتصال ببوابة الدفع"]);
      setStep("error");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePhoneContinue = () => {
    if (!validatePhone(phone)) return;
    handleCreatePayment();
  };

  /* ─── auto transition: instructions → status ──────────────────────────── */
  useEffect(() => {
    if (step === "instructions" && intent) {
      // small delay so the user sees the instructions, then auto-advance to polling
      const t = setTimeout(() => setStep("status"), 1200);
      return () => clearTimeout(t);
    }
  }, [step, intent]);

  /* ─── status → success ─────────────────────────────────────────────────── */
  const handlePaymentSuccess = useCallback(() => {
    setStep("success");
    // Refresh balance cache (just invalidate — the next /account or /library fetch will re-read)
  }, []);

  const handleRedirectAfterSuccess = useCallback(() => {
    if (returnHref) {
      // Validate it's a relative path to prevent open redirect
      const safe = returnHref.startsWith("/") ? returnHref : "/account";
      router.push(safe);
    } else {
      router.push("/account");
    }
  }, [returnHref, router]);

  /* ─── Render ───────────────────────────────────────────────────────────── */
  /* ─── Step indicator (lightweight) ──────────────────────────────────────── */
  const stepLabels = ["المبلغ", "الطريقة", "رقم المحفظة", "التعليمات", "الحالة", "تم"] as const;
  const stepMap: Step[] = ["amount", "method", "phone", "instructions", "status", "success"];
  const currentStepIdx = stepMap.indexOf(step);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        {/* Context hint */}
        {contextLabel && (
          <p className="mb-4 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {contextLabel}
          </p>
        )}

        {/* Step pills */}
        <div className="mb-8 flex items-center justify-center gap-1.5 overflow-x-auto pb-1" dir="rtl">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  i === currentStepIdx
                    ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black"
                    : i < currentStepIdx
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <span className="text-gray-300 dark:text-gray-600 text-xs">›</span>
              )}
            </div>
          ))}
        </div>

        {/* ════ STEP: AMOUNT ════ */}
        {step === "amount" && (
          <div dir="rtl" className="space-y-6">
            <h2 className="text-center text-xl font-extrabold text-gray-900 dark:text-white">
              اختر مبلغ الشحن
            </h2>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              اختر مبلغاً أو أدخله يدوياً. الحد الأدنى 5 جنيه والحد الأقصى 10,000 جنيه.
            </p>

            {/* Presets */}
            <div className="flex flex-wrap justify-center gap-2">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBaseAmount(String(p))}
                  className={`rounded-xl border-2 px-5 py-3 text-lg font-bold transition-all ${
                    baseAmount === String(p)
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-emerald-600"
                  }`}
                >
                  {p} <span className="text-xs opacity-60">جنيه</span>
                </button>
              ))}
            </div>

            {/* Custom */}
            <div className="mx-auto max-w-xs">
              <label className="mb-2 block text-xs font-bold text-gray-500 dark:text-gray-400">
                أو أدخل المبلغ:
              </label>
              <div className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                <input
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  placeholder="100"
                  min={5}
                  max={10000}
                  dir="ltr"
                  className="w-full bg-transparent text-center text-xl font-bold text-gray-900 outline-none dark:text-white"
                />
                <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">جنيه</span>
              </div>
            </div>

            {/* Fee hint */}
            {Number(baseAmount) >= 5 && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                إجمالي الخصم:{" "}
                <span className="font-bold text-gray-600 dark:text-gray-300">
                  {(Number(baseAmount) * 1.02).toFixed(2)} جنيه
                </span>{" "}
                (يشمل رسوم خدمة 2%)
              </p>
            )}

            <div className="flex justify-center">
              <Button onClick={handleAmountContinue} size="lg">
                متابعة
              </Button>
            </div>
          </div>
        )}

        {/* ════ STEP: METHOD ════ */}
        {step === "method" && (
          <div dir="rtl" className="space-y-5">
            <h2 className="text-center text-xl font-extrabold text-gray-900 dark:text-white">
              اختر طريقة الدفع
            </h2>
            <PaymentMethodGrid
              methods={methods}
              selectedId={selectedMethodId}
              onSelect={(m) => setSelectedMethodId(m.id)}
            />

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("amount")}>
                ← رجوع
              </Button>
              <Button onClick={handleMethodContinue} disabled={!selectedMethodId}>
                متابعة
              </Button>
            </div>
          </div>
        )}

        {/* ════ STEP: PHONE ════ */}
        {step === "phone" && selectedMethod && (
          <div dir="rtl" className="space-y-5">
            <div className="flex items-center justify-center gap-3">
              <PaymentProviderIcon method={selectedMethod} size={36} />
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                {selectedMethod.label}
              </h2>
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              أدخل رقم المحفظة المرتبط بحساب {selectedMethod.labelEn}
            </p>

            <div className="mx-auto max-w-sm">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) validatePhone(e.target.value);
                }}
                onBlur={() => validatePhone(phone)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className={`w-full rounded-xl border-2 px-4 py-3 text-center text-lg font-mono outline-none transition-colors ${
                  phoneError
                    ? "border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/20"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                } dark:text-white`}
              />
              {phoneError && (
                <p className="mt-2 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {phoneError}
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("method")}>
                ← رجوع
              </Button>
              <Button onClick={handlePhoneContinue} isLoading={isCreating}>
                شحن الرصيد
              </Button>
            </div>
          </div>
        )}

        {/* ════ STEP: INSTRUCTIONS ════ */}
        {step === "instructions" && intent && selectedMethod && (
          <div dir="rtl" className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <PaymentProviderIcon method={selectedMethod} size={40} />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{selectedMethod.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedMethod.labelEn}</p>
                </div>
              </div>

              {/* Reference */}
              <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  رقم المرجع
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-white px-3 py-2 text-lg font-bold tracking-wider text-emerald-900 dark:bg-gray-900 dark:text-emerald-100">
                    {intent.reference}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(intent.reference);
                        toastSuccess("تم نسخ رقم المرجع");
                      } catch {
                        /* noop */
                      }
                    }}
                    className="shrink-0 rounded-lg border-2 border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  >
                    نسخ
                  </button>
                </div>
              </div>

              {/* Step list */}
              {selectedMethod.instructions.length > 0 && (
                <ol className="mt-4 space-y-2">
                  {selectedMethod.instructions.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-6">{s}</span>
                    </li>
                  ))}
                </ol>
              )}

              {intent.paymentPageUrl && (
                <a
                  href={intent.paymentPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  فتح صفحة الدفع
                </a>
              )}
            </div>

            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              جاري التحقق من حالة الدفع تلقائياً …
            </p>
          </div>
        )}

        {/* ════ STEP: STATUS ════ */}
        {step === "status" && intent?.transactionId && (
          <>
            <PaymentStatus
              transactionId={String(intent.transactionId)}
              onSuccess={handlePaymentSuccess}
            />
            <div className="mt-4 flex justify-center" dir="rtl">
              <Button variant="secondary" size="sm" onClick={() => setStep("instructions")}>
                ← عرض التعليمات مرة أخرى
              </Button>
            </div>
          </>
        )}

        {/* ════ STEP: SUCCESS ════ */}
        {step === "success" && (
          <div dir="rtl" className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                تم شحن رصيدك بنجاح!
              </h3>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-300">
                تمت إضافة {intent?.totalAmount?.toFixed(2) ?? Number(baseAmount).toFixed(2)} جنيه إلى محفظتك
              </p>
            </div>
            <p className="text-xs text-emerald-500 dark:text-emerald-400">
              سيتم تحويلك تلقائياً خلال لحظات …
            </p>
            <Button onClick={handleRedirectAfterSuccess} variant="secondary">
              العودة الآن
            </Button>
          </div>
        )}

        {/* ════ STEP: ERROR ════ */}
        {step === "error" && (
          <>
            {errors.map((msg) => (
              <ErrorState key={msg} message={msg} onRetry={() => setStep("amount")} />
            ))}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<LoadingState label="جاري تحميل صفحة الدفع …" />}>
      <PaymentContent />
    </Suspense>
  );
}
