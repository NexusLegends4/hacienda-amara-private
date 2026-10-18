import { describe, expect, it } from "vitest";
import {
	getPhilippineMobileNumberForInput,
	isGmailAddress,
	isPhilippineMobileNumber,
	normalizePhilippineMobileNumber,
} from "../contact-validation";

describe("contact validation", () => {
	it("accepts Gmail addresses and rejects other email providers", () => {
		expect(isGmailAddress("person@gmail.com")).toBe(true);
		expect(isGmailAddress("person+booking@gmail.com")).toBe(true);
		expect(isGmailAddress("person@outlook.com")).toBe(false);
		expect(isGmailAddress("person@yahoo.com")).toBe(false);
	});

	it("accepts only Philippine mobile numbers with the +63 country code", () => {
		expect(isPhilippineMobileNumber("+639171234567")).toBe(true);
		expect(isPhilippineMobileNumber("+63 917-123-4567")).toBe(true);
		expect(isPhilippineMobileNumber("09171234567")).toBe(false);
		expect(isPhilippineMobileNumber("639171234567")).toBe(false);
		expect(isPhilippineMobileNumber("+14155552671")).toBe(false);
	});

	it("normalizes formatted numbers and legacy profile values", () => {
		expect(normalizePhilippineMobileNumber("+63 917-123-4567")).toBe("+639171234567");
		expect(getPhilippineMobileNumberForInput("09171234567")).toBe("+639171234567");
		expect(getPhilippineMobileNumberForInput("639171234567")).toBe("+639171234567");
	});
});
