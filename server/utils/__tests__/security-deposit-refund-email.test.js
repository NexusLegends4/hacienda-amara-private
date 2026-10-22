import { afterEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { sendSecurityDepositRefundEmail } from "../security-deposit-refund-email.js";

vi.mock("nodemailer", () => ({
	default: { createTransport: vi.fn() },
}));

describe("sendSecurityDepositRefundEmail", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		delete process.env.GMAIL_USER;
		delete process.env.GMAIL_APP_PASSWORD;
	});

	it("emails the guest when PayMongo confirms the deposit refund", async () => {
		process.env.GMAIL_USER = "resort@example.com";
		process.env.GMAIL_APP_PASSWORD = "test-password";
		const sendMail = vi.fn().mockResolvedValue({});
		nodemailer.createTransport.mockReturnValue({ sendMail });

		const result = await sendSecurityDepositRefundEmail({
			guest_name: "Guest",
			guest_email: "guest@example.com",
			room_type: "Day Time",
			check_in: "2026-10-26",
			security_deposit_amount: 2000,
		}, { status: "succeeded", refundId: "ref_123" });

		expect(result).toEqual({ sent: true });
		expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
			to: { name: "Guest", address: "guest@example.com" },
			subject: "Your Hacienda Amara security deposit has been refunded",
			text: expect.stringContaining("has been refunded to your original payment method"),
		}));
	});

	it("does not claim a pending refund is complete", async () => {
		process.env.GMAIL_USER = "resort@example.com";
		process.env.GMAIL_APP_PASSWORD = "test-password";
		const sendMail = vi.fn().mockResolvedValue({});
		nodemailer.createTransport.mockReturnValue({ sendMail });

		await sendSecurityDepositRefundEmail({
			guest_name: "Guest",
			guest_email: "guest@example.com",
			room_type: "Day Time",
			check_in: "2026-10-26",
			security_deposit_amount: 2000,
		}, { status: "pending", refundId: "ref_123" });

		expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
			subject: "Your Hacienda Amara security deposit refund is processing",
			text: expect.stringContaining("has been submitted to PayMongo and is processing"),
		}));
	});

	it("skips refunds that PayMongo has not accepted", async () => {
		const result = await sendSecurityDepositRefundEmail({}, { status: "manual_review" });
		expect(result).toEqual({ sent: false, skipped: true });
		expect(nodemailer.createTransport).not.toHaveBeenCalled();
	});
});
