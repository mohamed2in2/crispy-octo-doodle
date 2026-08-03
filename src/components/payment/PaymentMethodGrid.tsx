"use client";

import type { PaymentMethodConfig } from "@/lib/payment-methods";
import { PaymentMethodCard } from "./PaymentMethodCard";

/**
 * Responsive grid of payment-method cards.
 * Reads from the central PAYMENT_METHODS config — the parent passes in the
 * list (optionally filtered), so this component has zero hardcoded methods.
 */
export function PaymentMethodGrid({
  methods,
  selectedId,
  onSelect,
}: {
  methods: readonly PaymentMethodConfig[];
  selectedId: string | null;
  onSelect: (m: PaymentMethodConfig) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {methods.map((m) => (
        <PaymentMethodCard
          key={m.id}
          method={m}
          selected={selectedId === m.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
