import { describe, expect, it } from "vitest";
import { hasAal2Claim } from "../auth";

const createToken = (claims) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

describe("hasAal2Claim", () => {
  it("accepts a valid AAL2 claim", () => {
    expect(hasAal2Claim(createToken({ aal: "aal2" }))).toBe(true);
  });

  it("rejects AAL1 tokens", () => {
    expect(hasAal2Claim(createToken({ aal: "aal1" }))).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(hasAal2Claim("not-a-jwt")).toBe(false);
    expect(hasAal2Claim("header.not-json.signature")).toBe(false);
  });
});
