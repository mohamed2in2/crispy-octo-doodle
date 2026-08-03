"use client";

import type { PaymentMethodConfig } from "@/lib/payment-methods";
import { PaymentProviderIcon } from "./PaymentProviderIcon";

/**
 * A single selectable payment-method tile. The card is purely presentational
 * — selection state is controlled by the parent via `selected` / `onSelect`.
 * Unavailable methods render greyed-out with their maintenance note.
 */
export function PaymentMethodCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethodConfig;
  selected: boolean;
  onSelect: (m: PaymentMethodConfig) => void;
}) {
  const disabled = !method.available;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(method)}
      dir="rtl"
      className={[
        "group relative flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-right transition-all duration-200",
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/50"
          : selected
            ? "border-emerald-500 bg-emerald-50 shadow-md dark:border-emerald-400 dark:bg-emerald-950/40"
            : "border-gray-200 bg-white hover:border-emerald-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-500",
      ].join(" ")}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      <PaymentProviderIcon method={method} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-bold text-gray-900 dark:text-white">
            {method.label}
          </h3>
          {!method.available && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              غير متاح
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
          {method.processingSpeed}
        </p>
      </div>

      {/* Selection indicator */}
      <span
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected && !disabled
            ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400"
            : "border-gray-300 text-transparent dark:border-gray-600",
        ].join(" ")}
      >
        {selected && !disabled && (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
