"use client";

import type { PaymentMethodConfig } from "@/lib/payment-methods";

/**
 * Renders a provider brand badge: a colored circle with the monogram.
 * Keeps branding self-contained — no external image assets required,
 * which means new providers work instantly with a text monogram.
 */
export function PaymentProviderIcon({
  method,
  size = 44,
}: {
  method: PaymentMethodConfig;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-2xl font-bold leading-none shadow-sm"
      style={{
        width: size,
        height: size,
        background: method.brandColor,
        color: method.brandForeground,
        fontSize: size * 0.32,
      }}
    >
      {method.monogram}
    </span>
  );
}
