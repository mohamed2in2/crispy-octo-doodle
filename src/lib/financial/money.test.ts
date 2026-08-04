import { describe, expect, it } from "vitest"

import {
	PIASTRES_PER_POUND,
	piastresToPounds,
	poundsToPiastres,
} from "./money"

describe("poundsToPiastres", () => {
	it("converts whole pounds", () => {
		expect(poundsToPiastres(250)).toBe(25000)
		expect(poundsToPiastres(0)).toBe(0)
		expect(poundsToPiastres(1)).toBe(PIASTRES_PER_POUND)
	})

	it("converts fractional pounds", () => {
		expect(poundsToPiastres(12.5)).toBe(1250)
		expect(poundsToPiastres(0.01)).toBe(1)
	})

	it("absorbs float representation error rather than propagating it", () => {
		// 0.1 + 0.2 === 0.30000000000000004. The whole point of converting at the
		// boundary is that this becomes exactly 30 piastres and stops drifting.
		expect(poundsToPiastres(0.1 + 0.2)).toBe(30)
		expect(poundsToPiastres(1.005 * 3)).toBe(302)
	})

	it("rounds symmetrically around zero", () => {
		// Math.round(-0.5) is -0, which is why the implementation rounds the
		// magnitude and reapplies the sign instead of calling Math.round directly.
		expect(poundsToPiastres(0.005)).toBe(1)
		expect(poundsToPiastres(-0.005)).toBe(-1)
		expect(poundsToPiastres(12.345)).toBe(1235)
		expect(poundsToPiastres(-12.345)).toBe(-1235)
	})

	it("handles debits, which are stored as negative amounts", () => {
		expect(poundsToPiastres(-75.5)).toBe(-7550)
	})

	it("never returns a signed zero", () => {
		expect(Object.is(poundsToPiastres(-0), 0)).toBe(true)
		expect(Object.is(poundsToPiastres(-0.0001), 0)).toBe(true)
	})

	it("converts unusable input to zero instead of NaN", () => {
		expect(poundsToPiastres(undefined)).toBe(0)
		expect(poundsToPiastres(null)).toBe(0)
		expect(poundsToPiastres("250")).toBe(0)
		expect(poundsToPiastres(Number.NaN)).toBe(0)
		expect(poundsToPiastres(Number.POSITIVE_INFINITY)).toBe(0)
	})
})

describe("piastresToPounds", () => {
	it("round-trips whole values", () => {
		expect(piastresToPounds(25000)).toBe(250)
		expect(piastresToPounds(1)).toBe(0.01)
		expect(piastresToPounds(-7550)).toBe(-75.5)
	})

	it("ignores sub-piastre input", () => {
		expect(piastresToPounds(150.9)).toBe(1.5)
	})

	it("converts unusable input to zero", () => {
		expect(piastresToPounds(Number.NaN)).toBe(0)
	})
})
