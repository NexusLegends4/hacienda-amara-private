import { describe, expect, it } from "vitest";
import { hasStaffVerificationClaim } from "../auth";

const createToken = (claims) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

describe("hasStaffVerificationClaim", () => {
  it("accepts a valid AAL2 claim", () => {
    expect(hasStaffVerificationClaim(createToken({ aal: "aal2" }))).toBe(true);
  });

  it("accepts verified email OTP sign-in at AAL1", () => {
    expect(
      hasStaffVerificationClaim(
        createToken({ aal: "aal1", amr: [{ method: "otp" }] }),
      ),
    ).toBe(true);
  });

  it("rejects password and OAuth AAL1 sessions", () => {
    expect(
      hasStaffVerificationClaim(
        createToken({ aal: "aal1", amr: [{ method: "password" }] }),
      ),
    ).toBe(false);
    expect(
      hasStaffVerificationClaim(
        createToken({ aal: "aal1", amr: [{ method: "oauth" }] }),
      ),
    ).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(hasStaffVerificationClaim("not-a-jwt")).toBe(false);
    expect(hasStaffVerificationClaim("header.not-json.signature")).toBe(false);
  });
});
