import { describe, expect, it } from "vitest";
import { MAX_PACKAGE_PRICE, validatePackagePricing } from "../package-validation";

const validPricing = {
	base_price: "7000",
	min_price: "6000",
	max_price: "9000",
	additional_guest_price: "200",
};

describe("validatePackagePricing", () => {
	it("accepts non-negative whole prices within the configured maximum", () => {
		expect(validatePackagePricing(validPricing)).toBe("");
		expect(validatePackagePricing({ ...validPricing, max_price: MAX_PACKAGE_PRICE })).toBe("");
	});

	it("rejects blank, non-numeric, fractional, negative, and excessive prices", () => {
		for (const value of ["", "words", "10.5", "-1", String(MAX_PACKAGE_PRICE + 1)]) {
			expect(validatePackagePricing({ ...validPricing, base_price: value })).not.toBe("");
		}
	});

	it("rejects a minimum price greater than the maximum", () => {
		expect(validatePackagePricing({ ...validPricing, min_price: "10000" })).toBe(
			"Minimum price cannot be higher than maximum price.",
		);
	});
});
