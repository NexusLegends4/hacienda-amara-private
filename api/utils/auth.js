export function hasStaffVerificationClaim(accessToken) {
  const tokenParts = accessToken.split(".");
  if (tokenParts.length !== 3) return false;

  try {
    const claims = JSON.parse(
      Buffer.from(tokenParts[1], "base64url").toString("utf8"),
    );
    if (claims.aal === "aal2") return true;

    return (
      claims.aal === "aal1" &&
      Array.isArray(claims.amr) &&
      claims.amr.some((method) =>
        ["otp", "magiclink"].includes(method?.method),
      )
    );
  } catch {
    return false;
  }
}
