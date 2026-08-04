/**
 * Amount
 *
 * The single place money is turned into text in this application.
 *
 * Two rules matter here and they are the reason this component exists:
 *
 * 1. Money is an integer number of piastres, never a float. `0.1 + 0.2` is not
 *    `0.3` in IEEE-754, and a currency rounding error in a student's wallet is
 *    not a cosmetic bug. All arithmetic below is integer arithmetic.
 * 2. No other component may format money. If a second formatter appears, the
 *    two will drift and the same balance will render differently on two pages,
 *    which reads as a bug to the student even when the stored value is correct.
 *
 * Digits are Latin and the currency word is Arabic, matching the existing UI
 * ("120 \u062c\u0646\u064a\u0647"). The numeric run is marked `dir="ltr"` so the decimal
 * separator and thousands groups stay in the correct order inside an RTL page.
 */

export type AmountSize = "sm" | "base" | "lg" | "hero"

export type AmountProps = {
	/** Integer piastres. 12345 renders as "123.45". Fractions are truncated. */
	piastres: number
	size?: AmountSize
	/**
	 * Show an explicit + or - prefix. Use on ledger rows, where direction is the
	 * point. Leave off for balances and invoice totals, where a sign is noise.
	 */
	signed?: boolean
	/** Set false in dense tables that carry the currency in the column header. */
	showCurrency?: boolean
	className?: string
}

const CURRENCY_LABEL = "\u062c\u0646\u064a\u0647"

const SIZE_CLASS: Record<AmountSize, string> = {
	sm: "ds-amount--sm",
	base: "ds-amount--base",
	lg: "ds-amount--lg",
	hero: "ds-amount--hero",
}

const GROUPING = new Intl.NumberFormat("en-US", {
	useGrouping: true,
	maximumFractionDigits: 0,
})

/**
 * Formats integer piastres as a pounds string with exactly two decimal places.
 *
 * Exported so that non-React code (PDF receipts, notification bodies, CSV
 * exports) can reuse the identical formatting instead of reimplementing it.
 */
export function formatPiastres(piastres: number): string {
	// Defensive: a NaN balance should render as zero, not as "NaN \u062c\u0646\u064a\u0647".
	if (!Number.isFinite(piastres)) {
		return "0.00"
	}

	const whole = Math.trunc(piastres)
	const absolute = Math.abs(whole)

	// Integer division and remainder. No floating point anywhere.
	const pounds = Math.trunc(absolute / 100)
	const fraction = absolute % 100

	const paddedFraction = fraction < 10 ? `0${fraction}` : String(fraction)

	return `${GROUPING.format(pounds)}.${paddedFraction}`
}

export function Amount({
	piastres,
	size = "base",
	signed = false,
	showCurrency = true,
	className,
}: AmountProps) {
	const whole = Number.isFinite(piastres) ? Math.trunc(piastres) : 0
	const isNegative = whole < 0
	const isCredit = signed && whole > 0

	const magnitude = formatPiastres(whole)

	let prefix = ""
	if (isNegative) {
		prefix = "\u2212" // U+2212 minus, not a hyphen: it aligns with the digits.
	} else if (isCredit) {
		prefix = "+"
	}

	const toneClass = signed
		? isCredit
			? " ds-amount--credit"
			: " ds-amount--debit"
		: ""

	const classes = `ds-amount ${SIZE_CLASS[size]}${toneClass}${
		className ? ` ${className}` : ""
	}`

	return (
		<span className={classes}>
			<span className="ds-amount__value" dir="ltr">
				{prefix}
				{magnitude}
			</span>
			{showCurrency ? (
				<span className="ds-amount__currency">{CURRENCY_LABEL}</span>
			) : null}
		</span>
	)
}

/** Placeholder with the same footprint as a rendered amount. */
export function AmountSkeleton({ size = "base" }: { size?: AmountSize }) {
	const width = size === "hero" ? 168 : size === "lg" ? 104 : 72
	const height = size === "hero" ? 40 : size === "lg" ? 24 : 18

	return (
		<span
			className="ds-skeleton"
			style={{ width, height, display: "inline-block" }}
			aria-hidden="true"
		/>
	)
}

export default Amount
