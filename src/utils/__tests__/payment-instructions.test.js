import { describe, expect, it } from "vitest";
import { isPaymentInstructionsQuery, PAYMENT_INSTRUCTIONS } from "../payment-instructions";
import { moderateAssistantText } from "../chat-moderation";

describe("payment instructions", () => {
	it("provides the confirmed payment channels and booking terms", () => {
		expect(PAYMENT_INSTRUCTIONS).toContain("50% down payment");
		expect(PAYMENT_INSTRUCTIONS).toContain("₱2,000 refundable security deposit");
		expect(PAYMENT_INSTRUCTIONS).toContain("Mara Jane Garcia");
		expect(PAYMENT_INSTRUCTIONS).toContain("09683260522");
		expect(PAYMENT_INSTRUCTIONS).toContain("Mara Jane Rosales-Garcia");
		expect(PAYMENT_INSTRUCTIONS).toContain("010160005035");
		expect(PAYMENT_INSTRUCTIONS).toContain("manual staff verification");
		expect(moderateAssistantText(PAYMENT_INSTRUCTIONS).allowed).toBe(true);
	});

	it("identifies payment and reservation policy requests for deterministic replies", () => {
		expect(isPaymentInstructionsQuery("How do I pay by GCash?")).toBe(true);
		expect(isPaymentInstructionsQuery("saan ako magbabayad")).toBe(true);
		expect(isPaymentInstructionsQuery("How do I reserve the date?")).toBe(true);
		expect(isPaymentInstructionsQuery("What time is check-in?")).toBe(false);
	});
});
