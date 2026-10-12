import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});

const recentRequests = new Map<string, number>();
const RESEND_INTERVAL_MS = 60_000;

Deno.serve(async (request: Request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}
	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405);
	}

	const accessToken = (request.headers.get("Authorization") || "")
		.replace(/^Bearer\s+/i, "")
		.trim();
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const brevoApiKey = Deno.env.get("BREVO_API_KEY");
	const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
	const senderName = Deno.env.get("BREVO_SENDER_NAME") || "Hacienda Amara";

	if (!accessToken) {
		return jsonResponse({ error: "Sign in again to request a code." }, 401);
	}
	if (
		!supabaseUrl ||
		!anonKey ||
		!serviceRoleKey ||
		!brevoApiKey ||
		!senderEmail
	) {
		console.error("Staff email OTP configuration is incomplete.");
		return jsonResponse({ error: "Email verification is not configured." }, 503);
	}

	const userClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: `Bearer ${accessToken}` } },
		auth: { persistSession: false, autoRefreshToken: false },
	});
	const { data: authData, error: authError } =
		await userClient.auth.getUser(accessToken);
	if (authError || !authData.user?.email) {
		return jsonResponse(
			{ error: "Your login session expired. Sign in again." },
			401,
		);
	}

	const { data: profile, error: profileError } = await userClient
		.from("profiles")
		.select("role, deleted_at")
		.eq("id", authData.user.id)
		.maybeSingle();
	if (profileError) {
		console.error("Could not validate staff account:", profileError.message);
		return jsonResponse({ error: "Could not validate your account." }, 500);
	}
	if (
		!profile ||
		profile.deleted_at ||
		!["staff", "admin"].includes(profile.role)
	) {
		return jsonResponse(
			{ error: "Only active staff and admin accounts can request this code." },
			403,
		);
	}

	const now = Date.now();
	for (const [userId, requestedAt] of recentRequests) {
		if (now - requestedAt >= RESEND_INTERVAL_MS) recentRequests.delete(userId);
	}
	const lastRequest = recentRequests.get(authData.user.id);
	if (lastRequest) {
		return jsonResponse(
			{ error: "Please wait a minute before requesting another code." },
			429,
		);
	}
	recentRequests.set(authData.user.id, now);

	const adminClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
	const { data: linkData, error: linkError } =
		await adminClient.auth.admin.generateLink({
			type: "magiclink",
			email: authData.user.email,
		});
	if (
		linkError ||
		!linkData.properties?.email_otp ||
		linkData.user?.id !== authData.user.id
	) {
		recentRequests.delete(authData.user.id);
		console.error(
			"Supabase could not generate a staff email OTP:",
			linkError?.message || "User mismatch",
		);
		return jsonResponse(
			{ error: "Supabase could not create a sign-in code. Please try again." },
			502,
		);
	}

	let emailResponse: Response;
	try {
		emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
			method: "POST",
			headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
			body: JSON.stringify({
				sender: { email: senderEmail, name: senderName },
				to: [{ email: authData.user.email }],
				subject: "Your Hacienda Amara sign-in code",
				textContent: `Your Hacienda Amara sign-in code is ${linkData.properties.email_otp}. It expires according to your Supabase Auth email OTP settings.`,
				htmlContent: `<p>Your Hacienda Amara sign-in code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${linkData.properties.email_otp}</p><p>This code expires according to the Supabase Auth email OTP settings.</p>`,
			}),
		});
	} catch (error) {
		recentRequests.delete(authData.user.id);
		console.error(
			"Email provider request failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return jsonResponse(
			{ error: "Could not connect to the email provider." },
			502,
		);
	}

	if (!emailResponse.ok) {
		recentRequests.delete(authData.user.id);
		console.error(
			"Email provider rejected staff sign-in code:",
			emailResponse.status,
		);
		return jsonResponse(
			{ error: "The email provider rejected the verification email." },
			502,
		);
	}

	return jsonResponse({ success: true });
});
