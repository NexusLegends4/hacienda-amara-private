import { createClient } from "@supabase/supabase-js";
import { hasRecentEmailVerification } from "../server/utils/password-reset.js";

const json = (body, status = 200) => Response.json(body, { status });

export async function POST(request) {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !anonKey || !serviceRoleKey) {
		return json({ error: "Password reset is not configured on the server." }, 503);
	}

	try {
		const accessToken = (request.headers.get("authorization") || "")
			.replace(/^Bearer\s+/i, "")
			.trim();
		if (!accessToken || !hasRecentEmailVerification(accessToken)) {
			return json(
				{ error: "Request a new password reset link and open it from your email." },
				401,
			);
		}

		const body = await request.json();
		const password = body?.password;
		if (typeof password !== "string" || password.length < 8 || password.length > 128) {
			return json({ error: "Password must be between 8 and 128 characters." }, 400);
		}

		const authClient = createClient(supabaseUrl, anonKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		});
		const { data: userData, error: userError } =
			await authClient.auth.getUser(accessToken);
		if (userError || !userData.user || userData.user.is_anonymous) {
			return json(
				{ error: "Request a new password reset link and open it from your email." },
				401,
			);
		}

		const adminClient = createClient(supabaseUrl, serviceRoleKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		});
		const { error: updateError } = await adminClient.auth.admin.updateUserById(
			userData.user.id,
			{ password },
		);
		if (updateError) {
			console.error("Password recovery update failed:", updateError);
			return json({ error: updateError.message || "Unable to update the password." }, 400);
		}

		return json({ success: true });
	} catch (error) {
		console.error("Password recovery request failed:", error);
		return json({ error: "Unable to update the password right now. Please try again." }, 500);
	}
}
