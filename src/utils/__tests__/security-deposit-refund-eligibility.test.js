import { describe, expect, it } from "vitest";
import { canRefundSecurityDeposit } from "../security-deposit-refund-eligibility";

const today = "2026-10-22";
const refundableDeposit = {
	status: "confirmed",
	check_out: "2026-10-22",
	payment_status: "down_payment_paid",
	security_deposit_amount: 2000,
	security_deposit_refund_status: "not_requested",
};

describe("canRefundSecurityDeposit", () => {
	it("allows a paid confirmed reservation on or after check-out", () => {
		expect(canRefundSecurityDeposit(refundableDeposit, today)).toBe(true);
	});

	it("allows refunding a late payment for a denied reservation", () => {
		expect(canRefundSecurityDeposit({
			...refundableDeposit,
			status: "denied",
			check_out: "2026-10-26",
			late_payment_received_at: "2026-10-22T02:00:00.000Z",
		}, today)).toBe(true);
	});

	it.each([
		{ ...refundableDeposit, check_out: "2026-10-26" },
		{ ...refundableDeposit, status: "denied" },
		{ ...refundableDeposit, payment_status: "checkout_pending" },
		{ ...refundableDeposit, security_deposit_amount: 0 },
		{ ...refundableDeposit, security_deposit_refund_status: "processing" },
	])("rejects ineligible refunds: %j", (reservation) => {
		expect(canRefundSecurityDeposit(reservation, today)).toBe(false);
	});
});
