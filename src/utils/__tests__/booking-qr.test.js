import { describe, expect, it } from "vitest";
import { evaluateBooking, parseBookingQr } from "../booking-qr";

const reservationDate = new Date("2026-10-11T16:30:00.000Z");
const validBooking = {
	status: "confirmed",
	check_in: "2026-10-12",
	check_out: "2026-10-13",
};

describe("parseBookingQr", () => {
	it("accepts reservation ids and guest notification QR links", () => {
		const id = "77ef8745-3f23-4f4a-a6b8-2e23a5afc581";
		expect(parseBookingQr(id)).toEqual({ type: "booking", id });
		expect(parseBookingQr(`https://example.com/customer-notifications/${id}`))
			.toEqual({ type: "booking", id });
	});

	it("preserves legacy event links but rejects malformed booking links", () => {
		expect(parseBookingQr("https://example.com/view-event/123?from=qr"))
			.toEqual({ type: "event", id: "123", search: "?from=qr" });
		expect(parseBookingQr("https://example.com/customer-notifications/not-a-uuid"))
			.toEqual({ type: "unknown" });
		expect(parseBookingQr("https://example.com/customer-notifications/%E0%A4%A"))
			.toEqual({ type: "unknown" });
		expect(parseBookingQr("https://example.com/customer-notifications/77ef8745-3f23-4f4a-a6b8-2e23a5afc581/extra"))
			.toEqual({ type: "unknown" });
	});
});

describe("evaluateBooking", () => {
	it("accepts confirmed and legacy accepted bookings for the resort's local date", () => {
		expect(evaluateBooking(validBooking, reservationDate).tone).toBe("success");
		expect(evaluateBooking({ ...validBooking, status: "Accepted" }, reservationDate).tone).toBe("success");
	});

	it("rejects cancelled, pending, early, and expired reservations", () => {
		expect(evaluateBooking({ ...validBooking, status: "cancelled" }, reservationDate).tone).toBe("error");
		expect(evaluateBooking({ ...validBooking, status: "pending" }, reservationDate).tone).toBe("warning");
		expect(evaluateBooking({ ...validBooking, check_in: "2026-10-13" }, reservationDate).title).toBe("Too early");
		expect(evaluateBooking({
			...validBooking,
			check_in: "2026-10-10",
			check_out: "2026-10-11",
		}, reservationDate).title).toBe("Booking expired");
	});

	it("does not approve reservations with invalid date ranges", () => {
		expect(evaluateBooking({ ...validBooking, check_in: "2026-02-31" }, reservationDate).tone).toBe("error");
		expect(evaluateBooking({ ...validBooking, check_in: "2026-10-14" }, reservationDate).tone).toBe("error");
	});
});
