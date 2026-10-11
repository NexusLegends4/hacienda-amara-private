import { describe, test, expect } from "vitest";
import { parseScannedQr } from "../qrParser";

const ORIGIN = "https://hacienda-amara-private.vercel.app";
const UUID = "798ef0f6-700a-4bb9-9d2c-3df99cad75c0";

describe("parseScannedQr", () => {
	test("event links", () => {
		expect(parseScannedQr(`${ORIGIN}/view-event/42`, ORIGIN)).toEqual({ type: "event", id: "42" });
		expect(parseScannedQr(`${ORIGIN}/edit-event/${UUID}/`, ORIGIN)).toEqual({ type: "event", id: UUID });
	});

	test("reservation links and bare uuid", () => {
		expect(parseScannedQr(`${ORIGIN}/customer-notifications/${UUID}`, ORIGIN)).toEqual({ type: "reservation", id: UUID });
		expect(parseScannedQr(` ${UUID.toUpperCase()} `, ORIGIN)).toEqual({ type: "uuid", id: UUID });
		expect(parseScannedQr(`${ORIGIN}/customer-notifications/not-a-uuid`, ORIGIN).type).toBe("unknown");
	});

	test("public booking QR", () => {
		expect(parseScannedQr(`${ORIGIN}/rooms`, ORIGIN)).toEqual({ type: "booking" });
	});

	test("other websites are never treated as internal", () => {
		expect(parseScannedQr("https://evil.example/view-event/1", ORIGIN).type).toBe("external");
	});

	test("junk input", () => {
		expect(parseScannedQr("", ORIGIN).type).toBe("unknown");
		expect(parseScannedQr(`${ORIGIN}/admin-notifications`, ORIGIN).type).toBe("unknown");
		expect(parseScannedQr("WIFI:S:foo;T:WPA;P:bar;;", ORIGIN).type).toBe("unknown");
		expect(parseScannedQr("event-12", ORIGIN)).toEqual({ type: "text", id: "event-12" });
	});
});
