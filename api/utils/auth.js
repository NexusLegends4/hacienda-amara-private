export function hasAal2Claim(accessToken) {
  const tokenParts = accessToken.split(".");
  if (tokenParts.length !== 3) return false;

  try {
    const claims = JSON.parse(
      Buffer.from(tokenParts[1], "base64url").toString("utf8"),
    );
    return claims.aal === "aal2";
  } catch {
    return false;
  }
}
