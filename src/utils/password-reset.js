export function requiresTotpVerification(assurance) {
	return assurance?.currentLevel !== "aal2" && assurance?.nextLevel === "aal2";
}

export function findVerifiedTotpFactor(factors) {
	return factors?.totp?.find((factor) => factor.status === "verified") || null;
}

export function isAal2PasswordUpdateError(error) {
	return /aal2 session is required/i.test(error?.message || "");
}
