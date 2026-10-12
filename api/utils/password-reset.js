const EMAIL_VERIFICATION_METHODS = new Set(["otp", "magiclink", "recovery"]);
const RECOVERY_VERIFICATION_MAX_AGE_MS = 30 * 60 * 1000;

export function hasRecentEmailVerification(accessToken, now = Date.now()) {
	const tokenParts = typeof accessToken === "string" ? accessToken.split(".") : [];
	if (tokenParts.length !== 3) return false;

	try {
		const claims = JSON.parse(
			Buffer.from(tokenParts[1], "base64url").toString("utf8"),
		);
		if (claims.aal !== "aal1" && claims.aal !== "aal2") return false;
		if (!Array.isArray(claims.amr)) return false;

		return claims.amr.some((method) => {
			if (!EMAIL_VERIFICATION_METHODS.has(method?.method)) return false;
			if (!Number.isFinite(method.timestamp)) return false;

			const verifiedAt = method.timestamp * 1000;
			const age = now - verifiedAt;
			return age >= 0 && age <= RECOVERY_VERIFICATION_MAX_AGE_MS;
		});
	} catch {
		return false;
	}
}
