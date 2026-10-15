import { describe, expect, it } from "vitest";
import { hasRecentEmailVerification } from "../password-reset.js";

const createToken = (claims) =>
	[
		"header",
		Buffer.from(JSON.stringify(claims)).toString("base64url"),
		"signature",
	].join(".");

describe("hasRecentEmailVerification", () => {
	const now = Date.UTC(2026, 9, 12, 12);

	it("accepts a recent verified email OTP or recovery session", () => {
		expect(
			hasRecentEmailVerification(
				createToken({
					aal: "aal1",
					amr: [{ method: "otp", timestamp: now / 1000 }],
				}),
				now,
			),
		).toBe(true);
		expect(
			hasRecentEmailVerification(
				createToken({
					aal: "aal1",
					amr: [{ method: "recovery", timestamp: now / 1000 }],
				}),
				now,
			),
		).toBe(true);
	});

	it("rejects password-only, invalid, expired, and future-dated sessions", () => {
		expect(
			hasRecentEmailVerification(
				createToken({
					aal: "aal1",
					amr: [{ method: "password", timestamp: now / 1000 }],
				}),
				now,
			),
		).toBe(false);
		expect(
			hasRecentEmailVerification(
				createToken({
					aal: "aal1",
					amr: [{ method: "otp", timestamp: now / 1000 - 1801 }],
				}),
				now,
			),
		).toBe(false);
		expect(
			hasRecentEmailVerification(
				createToken({
					aal: "aal1",
					amr: [{ method: "otp", timestamp: now / 1000 + 1 }],
				}),
				now,
			),
		).toBe(false);
		expect(hasRecentEmailVerification("not-a-token", now)).toBe(false);
	});

	it("rejects sessions without a valid assurance level or verification timestamp", () => {
		expect(
			hasRecentEmailVerification(
				createToken({
					aal: "aal3",
					amr: [{ method: "otp", timestamp: now / 1000 }],
				}),
				now,
			),
		).toBe(false);
		expect(
			hasRecentEmailVerification(
				createToken({ aal: "aal1", amr: [{ method: "otp" }] }),
				now,
			),
		).toBe(false);
	});
});
