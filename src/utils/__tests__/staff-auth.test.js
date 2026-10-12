import { describe, expect, it } from "vitest";
import { hasStaffVerificationClaim } from "../staff-auth";

const createToken = (claims) =>
	`header.${btoa(JSON.stringify(claims))}.signature`;

describe("hasStaffVerificationClaim", () => {
	it("accepts AAL2 authenticator sessions", () => {
		expect(hasStaffVerificationClaim(createToken({ aal: "aal2" }))).toBe(true);
	});

	it("accepts AAL1 sessions authenticated by email OTP", () => {
		expect(
			hasStaffVerificationClaim(
				createToken({ aal: "aal1", amr: [{ method: "otp" }] }),
			),
		).toBe(true);
	});

	it("rejects password-only AAL1 and malformed tokens", () => {
		expect(
			hasStaffVerificationClaim(
				createToken({ aal: "aal1", amr: [{ method: "password" }] }),
			),
		).toBe(false);
		expect(hasStaffVerificationClaim("not-a-jwt")).toBe(false);
	});
});
