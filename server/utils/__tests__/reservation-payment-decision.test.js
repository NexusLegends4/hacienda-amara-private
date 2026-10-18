import { describe, expect, it } from "vitest";
import { getInitialPaymentDecision } from "../reservation-payment-decision.js";

describe("getInitialPaymentDecision", () => {
	const now = Date.parse("2026-10-18T10:00:00.000Z");

	it("automatically confirms payment received before the deadline", () => {
		expect(getInitialPaymentDecision({
			status: "pending",
			initial_payment_deadline_at: "2026-10-18T10:01:00.000Z",
		}, now)).toEqual({ status: "confirmed", late: false });
	});

	it("keeps expired or missing-deadline payments denied for staff review", () => {
		expect(getInitialPaymentDecision({
			status: "pending",
			initial_payment_deadline_at: "2026-10-18T10:00:00.000Z",
		}, now)).toEqual({ status: "denied", late: true });
		expect(getInitialPaymentDecision({
			status: "denied",
			initial_payment_deadline_at: "2026-10-18T10:01:00.000Z",
		}, now)).toEqual({ status: "denied", late: true });
	});

	it("does not make a second reservation decision after cancellation", () => {
		expect(getInitialPaymentDecision({ status: "cancelled" }, now))
			.toEqual({ status: "cancelled", late: false });
	});
});
