import { describe, expect, it } from "vitest";
import {
	canRefundSecurityDeposit,
	shouldShowSecurityDepositRefund,
} from "../security-deposit-refund-eligibility";

const today = "2026-10-22";
const refundableDeposit = {
	status: "confirmed",
	check_out: "2026-10-22",
	payment_status: "down_payment_paid",
	paymongo_checkout_payment_id: "pay_123",
	security_deposit_amount: 2000,
	security_deposit_refund_status: "not_requested",
};

describe("canRefundSecurityDeposit", () => {
	it("allows a paid confirmed reservation on or after check-out", () => {
		expect(canRefundSecurityDeposit(refundableDeposit, today)).toBe(true);
	});

	it("allows refunding a captured payment for a denied reservation", () => {
		expect(canRefundSecurityDeposit({
			...refundableDeposit,
			status: "denied",
			check_out: "2026-10-26",
		}, today)).toBe(true);
	});

	it("allows a cancelled reservation refund before the scheduled check-out", () => {
		expect(canRefundSecurityDeposit({
			...refundableDeposit,
			status: "cancelled",
			check_out: "2026-10-26",
		}, today)).toBe(true);
	});

	it.each(["denied", "cancelled"])("shows the refund button for unpaid %s reservations", (status) => {
		expect(shouldShowSecurityDepositRefund({
			...refundableDeposit,
			status,
			payment_status: "checkout_pending",
			paymongo_checkout_payment_id: null,
		}, today)).toBe(true);
		expect(canRefundSecurityDeposit({
			...refundableDeposit,
			status,
			payment_status: "checkout_pending",
			paymongo_checkout_payment_id: null,
		}, today)).toBe(false);
	});

	it.each([
		{ ...refundableDeposit, check_out: "2026-10-26" },
		{ ...refundableDeposit, payment_status: "checkout_pending" },
		{ ...refundableDeposit, paymongo_checkout_payment_id: null },
		{ ...refundableDeposit, security_deposit_amount: 0 },
		{ ...refundableDeposit, security_deposit_refund_status: "processing" },
	])("rejects ineligible refunds: %j", (reservation) => {
		expect(canRefundSecurityDeposit(reservation, today)).toBe(false);
	});
});
