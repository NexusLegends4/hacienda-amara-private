import { hasStaffVerificationClaim } from "./auth.js";

export async function getVerifiedStaff(request, supabaseUrl, serviceRoleKey) {
	const accessToken = (request.headers.get("authorization") || "")
		.replace(/^Bearer\s+/i, "")
		.trim();
	if (!accessToken || !hasStaffVerificationClaim(accessToken)) return null;

	const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
		headers: {
			apikey: serviceRoleKey,
			Authorization: `Bearer ${accessToken}`,
		},
	});
	if (!userResponse.ok) return null;
	const user = await userResponse.json();

	const profileResponse = await fetch(
		`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`,
		{ headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
	);
	if (!profileResponse.ok) return null;

	const profiles = await profileResponse.json();
	return ["admin", "staff"].includes(profiles[0]?.role) ? user : null;
}
