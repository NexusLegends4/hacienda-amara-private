import { describe, expect, it } from "vitest";
import { getAccountDisplayName, normalizeAccountRole } from "../account-profile";

describe("account profile display", () => {
	it.each([
		["admin", "admin"],
		["staff", "staff"],
		["client", "client"],
		["user", "client"],
		[null, "client"],
		["unknown", "client"],
	])("normalizes role %s to %s", (role, expected) => {
		expect(normalizeAccountRole(role)).toBe(expected);
	});

	it("uses the account name, email, or a role-aware fallback", () => {
		expect(getAccountDisplayName({ firstname: "Alex", lastname: "Garcia", email: "alex@gmail.com", role: "client" }))
			.toBe("Alex Garcia");
		expect(getAccountDisplayName({ email: "alex@gmail.com", role: "client" })).toBe("alex@gmail.com");
		expect(getAccountDisplayName({ role: "client" })).toBe("Unnamed client");
		expect(getAccountDisplayName({ role: "staff" })).toBe("Unnamed staff");
	});
});
