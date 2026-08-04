/**
 * Money conversion.
 *
 * ## The unit boundary
 *
 * The database stores money as **Float pounds**. Verified against
 * `prisma/schema.prisma`:
 *
 * ```prisma
 * model User               { balance Float @default(0) }
 * model BalanceTransaction { amount  Float }  // positive = credit, negative = debit
 * model MoneyCode          { amount  Float }
 * model TeacherSubscription{ amount  Float }
 * ```
 *
 * Everything above this module works in **integer piastres**. This file is the
 * only place the two representations meet.
 *
 * ## Why integer piastres above this line
 *
 * Storing money as a binary float is a genuine defect, not a style preference.
 * `0.1 + 0.2 !== 0.3` in IEEE-754, so a balance built up from many float
 * additions drifts away from the sum a human would compute. On a wallet that is
 * credited and debited repeatedly, the drift is cumulative and eventually shows
 * up as a balance ending in something like `.9999999999998`, or as a student
 * being one piastre short of a purchase they can afford.
 *
 * Fixing the columns requires a migration and a backfill, which is out of scope
 * for the UI work. Converting once at this boundary is the next best thing: the
 * drift cannot grow any further inside the new financial code, because above
 * this line there are no fractions to drift.
 *
 * ## Rounding
 *
 * Rounding is half-away-from-zero on the piastre, applied symmetrically so that
 * a debit and a credit of the same magnitude convert to the same absolute value.
 * Truncation is deliberately not used: it would quietly round every fractional
 * piastre in the platform's favour and against the student.
 */

export const PIASTRES_PER_POUND = 100

/**
 * Converts a Float pounds value from the database into integer piastres.
 *
 * Non-numeric and non-finite input converts to `0` rather than propagating
 * `NaN`. A `NaN` reaching the UI would render as a broken balance, which on a
 * money page is worse than a zero that the caller can detect and explain.
 */
export function poundsToPiastres(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return 0
	}

	// Math.round is half-up, which is asymmetric for negatives:
	// Math.round(-0.5) === -0, not -1. Rounding the magnitude and reapplying the
	// sign keeps credits and debits symmetric.
	const sign = value < 0 ? -1 : 1
	const piastres = Math.round(Math.abs(value) * PIASTRES_PER_POUND) * sign

	// Normalise -0 to 0 so that formatting never produces a signed zero.
	return piastres === 0 ? 0 : piastres
}

/**
 * Converts integer piastres back into a pounds number.
 *
 * Only for writing to the existing Float columns. Never use this to do
 * arithmetic — do the arithmetic in piastres and convert once at the end.
 */
export function piastresToPounds(piastres: number): number {
	if (!Number.isFinite(piastres)) {
		return 0
	}

	return Math.trunc(piastres) / PIASTRES_PER_POUND
}
