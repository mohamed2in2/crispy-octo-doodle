import { describe, expect, it } from "vitest";

import {
	bookingAvailability,
	canPayNow,
	lowestPrice,
} from "@/lib/classic/booking";

const NOW = new Date("2026-08-04T20:00:00.000Z");

const base = {
	isPublished: true,
	teacherDeleted: false,
	priceMonthly: 200,
	priceTermly: 500,
	priceYearly: 1200,
	courseStartDate: null,
	bookingContactUrl: null,
};

describe("lowestPrice", () => {
	it("picks the cheapest usable term", () => {
		expect(lowestPrice({ priceMonthly: 200, priceTermly: 500, priceYearly: 1200 })).toBe(200);
		expect(lowestPrice({ priceMonthly: null, priceTermly: 500, priceYearly: 400 })).toBe(400);
	});

	it("treats zero, negatives and non-finite values as unset, not as free", () => {
		expect(lowestPrice({ priceMonthly: 0, priceTermly: 0, priceYearly: 0 })).toBeNull();
		expect(lowestPrice({ priceMonthly: -50, priceTermly: null, priceYearly: null })).toBeNull();
		expect(lowestPrice({ priceMonthly: Number.NaN, priceTermly: null, priceYearly: 300 })).toBe(300);
	});
});

describe("bookingAvailability", () => {
	it("hides unpublished profiles and deleted teachers", () => {
		expect(bookingAvailability({ ...base, isPublished: false }, NOW).kind).toBe("closed");
		expect(bookingAvailability({ ...base, teacherDeleted: true }, NOW).kind).toBe("closed");
	});

	it("closes booking when no term is priced and there is nowhere to ask", () => {
		const state = bookingAvailability(
			{ ...base, priceMonthly: null, priceTermly: null, priceYearly: null },
			NOW,
		);
		expect(state.kind).toBe("closed");
	});

	it("falls back to contact when the teacher books by hand", () => {
		const state = bookingAvailability(
			{
				...base,
				priceMonthly: null,
				priceTermly: null,
				priceYearly: null,
				bookingContactUrl: "https://wa.me/201000000000",
			},
			NOW,
		);
		expect(state).toEqual({
			kind: "contact",
			contactUrl: "https://wa.me/201000000000",
		});
	});

	it("rejects a contact URL that is not followable", () => {
		const state = bookingAvailability(
			{
				...base,
				priceMonthly: null,
				priceTermly: null,
				priceYearly: null,
				bookingContactUrl: "javascript:alert(1)",
			},
			NOW,
		);
		expect(state.kind).toBe("closed");
	});

	it("reports a future start date as upcoming and still allows paying", () => {
		const state = bookingAvailability(
			{ ...base, courseStartDate: "2026-09-01T07:00:00.000Z" },
			NOW,
		);
		expect(state.kind).toBe("upcoming");
		expect(canPayNow(state)).toBe(true);
	});

	it("reports a past start date as late rather than hiding the course", () => {
		const state = bookingAvailability(
			{ ...base, courseStartDate: new Date("2026-07-01T07:00:00.000Z") },
			NOW,
		);
		expect(state.kind).toBe("late");
		expect(canPayNow(state)).toBe(true);
	});

	it("ignores an unparseable start date instead of blocking the sale", () => {
		const state = bookingAvailability({ ...base, courseStartDate: "not a date" }, NOW);
		expect(state).toEqual({ kind: "open", priceFromPounds: 200 });
	});

	it("never offers payment on a closed or contact-only profile", () => {
		expect(canPayNow({ kind: "closed" })).toBe(false);
		expect(canPayNow({ kind: "contact", contactUrl: "/plans" })).toBe(false);
	});
});
