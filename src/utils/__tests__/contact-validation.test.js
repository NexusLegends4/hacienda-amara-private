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

	it("accepts only 11-digit Philippine mobile numbers in local format", () => {
		expect(isPhilippineMobileNumber("09297467879")).toBe(true);
		expect(isPhilippineMobileNumber("0929 746 7879")).toBe(true);
		expect(isPhilippineMobileNumber("0929-746-7879")).toBe(true);
		expect(isPhilippineMobileNumber("0929746787")).toBe(false);
		expect(isPhilippineMobileNumber("092974678799")).toBe(false);
		expect(isPhilippineMobileNumber("639297467879")).toBe(false);
		expect(isPhilippineMobileNumber("+14155552671")).toBe(false);
	});

	it("normalizes formatted numbers and legacy profile values", () => {
		expect(normalizePhilippineMobileNumber("0929 746 7879")).toBe("09297467879");
		expect(getPhilippineMobileNumberForInput("0929 746 7879")).toBe("09297467879");
		expect(getPhilippineMobileNumberForInput("+639297467879")).toBe("09297467879");
	});
});
