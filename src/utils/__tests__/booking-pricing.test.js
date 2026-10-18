import { describe, expect, it } from "vitest";
import { calculateBookingTotal, isWeekendOrHoliday } from "../booking-pricing";

describe("booking pricing", () => {
	const pkg = {
		base_price: 7_000,
		max_price: 8_000,
		max_guests: 20,
		additional_guest_price: 200,
	};

	it("uses weekday and weekend rates consistently", () => {
		expect(calculateBookingTotal("2026-10-19", pkg, 20)).toBe(7_000);
		expect(calculateBookingTotal("2026-10-23", pkg, 20)).toBe(8_000);
		expect(isWeekendOrHoliday("2026-12-25")).toBe(true);
	});

	it("includes additional guests and returns zero without a date or package", () => {
		expect(calculateBookingTotal("2026-10-19", pkg, 22)).toBe(7_400);
		expect(calculateBookingTotal("", pkg, 22)).toBe(0);
		expect(calculateBookingTotal("2026-10-19", null, 22)).toBe(0);
	});
});
