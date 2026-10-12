import { describe, expect, it } from "vitest";
import {
	findVerifiedTotpFactor,
	isAal2PasswordUpdateError,
	requiresTotpVerification,
} from "../password-reset";

describe("password reset MFA helpers", () => {
	it("requires TOTP when a recovery session can step up to AAL2", () => {
		expect(
			requiresTotpVerification({ currentLevel: "aal1", nextLevel: "aal2" }),
		).toBe(true);
		expect(
			requiresTotpVerification({ currentLevel: "aal2", nextLevel: "aal2" }),
		).toBe(false);
		expect(
			requiresTotpVerification({ currentLevel: "aal1", nextLevel: "aal1" }),
		).toBe(false);
	});

	it("selects only a verified authenticator factor", () => {
		const verifiedFactor = { id: "verified", status: "verified" };
		expect(
			findVerifiedTotpFactor({
				totp: [
					{ id: "pending", status: "unverified" },
					verifiedFactor,
				],
			}),
		).toBe(verifiedFactor);
		expect(findVerifiedTotpFactor({ totp: [] })).toBeNull();
	});

	it("recognizes Supabase AAL2 password update errors", () => {
		expect(
			isAal2PasswordUpdateError({
				message:
					"AAL2 session is required to update email or password when MFA is enabled.",
			}),
		).toBe(true);
		expect(isAal2PasswordUpdateError({ message: "Invalid password" })).toBe(false);
	});
});
