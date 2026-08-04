/**
 * Refund state machine.
 *
 * Refunds move money back to a student, so the set of legal transitions is
 * declared explicitly rather than left to whichever call site happens to update
 * the row. An illegal transition is a caller bug and is reported as one instead
 * of being silently written to the database.
 */

import type { RefundStatus } from "./types"

/** Legal next states for each state. Terminal states have none. */
const TRANSITIONS: Record<RefundStatus, ReadonlyArray<RefundStatus>> = {
	requested: ["under_review", "rejected"],
	under_review: ["approved", "rejected"],
	// Approved means staff agreed; settled means the money actually moved. The
	// gap between the two is deliberate and must stay visible to the student.
	approved: ["settled"],
	rejected: [],
	settled: [],
}

export function allowedTransitions(
	from: RefundStatus,
): ReadonlyArray<RefundStatus> {
	return TRANSITIONS[from] ?? []
}

export function canTransition(
	from: RefundStatus,
	to: RefundStatus,
): boolean {
	return allowedTransitions(from).includes(to)
}

export function isTerminal(status: RefundStatus): boolean {
	return allowedTransitions(status).length === 0
}

export class IllegalRefundTransitionError extends Error {
	readonly from: RefundStatus
	readonly to: RefundStatus

	constructor(from: RefundStatus, to: RefundStatus) {
		super(`Illegal refund transition: ${from} -> ${to}`)
		this.name = "IllegalRefundTransitionError"
		this.from = from
		this.to = to
	}
}

/**
 * Validates a transition, throwing if it is not permitted.
 *
 * Call this before writing a refund status anywhere.
 */
export function assertTransition(from: RefundStatus, to: RefundStatus): void {
	if (!canTransition(from, to)) {
		throw new IllegalRefundTransitionError(from, to)
	}
}
