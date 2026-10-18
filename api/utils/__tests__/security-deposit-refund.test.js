import { afterEach, describe, expect, it, vi } from "vitest";
import { refundSecurityDeposit } from "../security-deposit-refund.js";

const createSupabaseMock = (claimSucceeded = true) => {
	const calls = [];
	return {
		calls,
		from: vi.fn(() => {
			const query = {
				operation: null,
				values: null,
				update(values) {
					this.operation = "update";
					this.values = values;
					calls.push(values);
					return this;
				},
				select() {
					this.operation = "select";
					return this;
				},
				eq() { return this; },
				in() { return this; },
				maybeSingle() {
					return Promise.resolve(this.values
						? { data: claimSucceeded ? { id: "reservation-id" } : null, error: null }
						: { data: { security_deposit_refund_status: "pending" }, error: null });
				},
				then(resolve, reject) {
					return Promise.resolve({ error: null }).then(resolve, reject);
				},
			};
			return query;
		}),
	};
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("refundSecurityDeposit", () => {
	const reservation = {
		id: "reservation-id",
		payment_status: "down_payment_paid",
		security_deposit_amount: 2000,
		paymongo_checkout_payment_id: "pay_123",
	};

	it("submits only the deposit amount as a partial refund and stores the pending refund", async () => {
		const supabase = createSupabaseMock();
		const fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				data: {
					id: "ref_123",
					attributes: { amount: 200000, payment_id: "pay_123", status: "pending" },
				},
			}),
		});
		vi.stubGlobal("fetch", fetch);

		const result = await refundSecurityDeposit(
			supabase,
			reservation,
			"sk_test_secret",
			"Cancelled booking",
		);

		expect(result).toEqual({ status: "pending", refundId: "ref_123" });
		expect(fetch).toHaveBeenCalledOnce();
		expect(fetch.mock.calls[0][0]).toBe("https://api.paymongo.com/v1/refunds");
		expect(JSON.parse(fetch.mock.calls[0][1].body).data.attributes).toMatchObject({
			amount: 200000,
			payment_id: "pay_123",
			reason: "requested_by_customer",
		});
		expect(supabase.calls).toContainEqual({
			security_deposit_refund_status: "pending",
			paymongo_security_deposit_refund_id: "ref_123",
			security_deposit_refund_requested_at: expect.any(String),
		});
	});

	it("does not call PayMongo when another request already claimed the refund", async () => {
		const supabase = createSupabaseMock(false);
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);

		const result = await refundSecurityDeposit(
			supabase,
			reservation,
			"sk_test_secret",
			"Cancelled booking",
		);

		expect(result).toEqual({ status: "pending" });
		expect(fetch).not.toHaveBeenCalled();
	});
});
