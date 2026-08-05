/*
 * Booking availability: one decision, one place.
 *
 * Before this file, "can this student book this teacher?" was answered
 * separately by the teacher page, the booking modal and the plans list, each
 * looking at a different subset of prices, dates and the contact URL. That is
 * how a platform ends up offering a button that cannot work.
 *
 * The rules, in the order they are applied. Order matters: the first match
 * wins, so the most restrictive conditions are checked first.
 *
 *   1. Not published, or the teacher is deleted -> the profile does not exist
 *      as far as the student is concerned. "closed".
 *   2. No usable price on any term AND no contact URL -> the teacher has not
 *      set up subscriptions at all. "closed". The student can still buy
 *      individual courses; that path does not go through booking.
 *   3. No usable price but a contact URL exists -> the teacher takes bookings
 *      by hand (WhatsApp, a centre, a form). "contact". Never show a price.
 *   4. A start date in the future -> "upcoming". Booking is still allowed; a
 *      student who pays now is pre-enrolling. The UI must show the date, or
 *      it looks like they bought access that then does not work.
 *   5. A start date in the past -> "late". Booking is allowed, but the UI has
 *      to say the course already started so nobody feels tricked.
 *   6. Otherwise -> "open".
 *
 * Deliberately NOT decided here:
 *   - Whether a teacher wants purchase-only (courses, no subscription). That
 *     is expressed by leaving all three prices empty, which lands on rule 2.
 *   - Discounts. The discount* columns exist but their unit is ambiguous in
 *     the schema (percentage or absolute pounds), so this file refuses to
 *     guess and reports the undiscounted floor price only.
 *   - Money units. These prices are Float pounds in Prisma, like every other
 *     amount in the schema. That is a real defect tracked separately; it is
 *     not this function's job to paper over it.
 */

export type BookingAvailability =
	| { kind: "open"; priceFromPounds: number | null }
	| { kind: "upcoming"; startsAtIso: string; priceFromPounds: number | null }
	| { kind: "late"; startedAtIso: string; priceFromPounds: number | null }
	| { kind: "contact"; contactUrl: string }
	| { kind: "closed" };

export type BookingInput = {
	isPublished: boolean;
	teacherDeleted: boolean;
	priceMonthly: number | null;
	priceTermly: number | null;
	priceYearly: number | null;
	courseStartDate: Date | string | null;
	bookingContactUrl: string | null;
};

/**
 * The cheapest term a student could actually pay for.
 *
 * Zero and negative are treated as "not set", not as free: a free
 * subscription is expressed by publishing free courses, and a 0 here has
 * always meant an admin left the field blank.
 */
export function lowestPrice(input: {
	priceMonthly: number | null;
	priceTermly: number | null;
	priceYearly: number | null;
}): number | null {
	const usable = [input.priceMonthly, input.priceTermly, input.priceYearly]
		.filter(
			(value): value is number =>
				typeof value === "number" && Number.isFinite(value) && value > 0,
		)
		.sort((a, b) => a - b);

	return usable.length > 0 ? usable[0] : null;
}

/** Only same-origin paths and http(s) URLs are followable. */
function usableContactUrl(raw: string | null): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (value.length === 0) return null;
	if (value.startsWith("/")) return value;
	if (/^https?:\/\//i.test(value)) return value;
	return null;
}

function toDate(value: Date | string | null): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function bookingAvailability(
	input: BookingInput,
	now: Date = new Date(),
): BookingAvailability {
	// Rule 1
	if (!input.isPublished || input.teacherDeleted) return { kind: "closed" };

	const priceFromPounds = lowestPrice(input);
	const contactUrl = usableContactUrl(input.bookingContactUrl);

	// Rules 2 and 3
	if (priceFromPounds === null) {
		return contactUrl ? { kind: "contact", contactUrl } : { kind: "closed" };
	}

	const start = toDate(input.courseStartDate);

	// Rules 4 and 5
	if (start) {
		if (start.getTime() > now.getTime()) {
			return {
				kind: "upcoming",
				startsAtIso: start.toISOString(),
				priceFromPounds,
			};
		}
		return { kind: "late", startedAtIso: start.toISOString(), priceFromPounds };
	}

	// Rule 6
	return { kind: "open", priceFromPounds };
}

/** True when a pay button should be rendered at all. */
export function canPayNow(state: BookingAvailability): boolean {
	return (
		state.kind === "open" || state.kind === "upcoming" || state.kind === "late"
	);
}
