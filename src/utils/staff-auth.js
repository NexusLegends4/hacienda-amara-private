export function hasStaffVerificationClaim(accessToken) {
	const tokenParts = accessToken?.split(".");
	if (tokenParts?.length !== 3) return false;

	try {
		const base64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
		const bytes = Uint8Array.from(atob(padded), (character) =>
			character.charCodeAt(0),
		);
		const claims = JSON.parse(new TextDecoder().decode(bytes));

		return (
			claims.aal === "aal2" ||
			(claims.aal === "aal1" &&
				Array.isArray(claims.amr) &&
				claims.amr.some((method) =>
					["otp", "magiclink"].includes(method?.method),
				))
		);
	} catch {
		return false;
	}
}
