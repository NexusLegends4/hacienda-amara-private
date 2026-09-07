const allowedStatuses = new Set(["confirmed", "cancelled"]);

const getAdminUser = async (request) => {
	const authorization = request.headers.get("authorization") || "";
	const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!accessToken || !supabaseUrl || !serviceRoleKey) return null;

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
};

const escapeHtml = (value) =>
	String(value || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");

export async function POST(request) {
	if (!await getAdminUser(request)) {
		return Response.json({ error: "Only admin or staff users can send reservation notifications." }, { status: 403 });
	}

	let body;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid request body." }, { status: 400 });
	}

	const { name, email, status, roomType, checkIn } = body || {};
	if (!name || !email || !allowedStatuses.has(status) || !roomType || !checkIn) {
		return Response.json({ error: "Missing or invalid reservation details." }, { status: 400 });
	}

	if (!process.env.MAILTRAP_API_TOKEN || !process.env.MAILTRAP_FROM_EMAIL) {
		return Response.json({ error: "Email notification is not configured." }, { status: 503 });
	}

	const accepted = status === "confirmed";
	const subject = accepted ? "Your Hacienda Amara reservation was accepted" : "Update on your Hacienda Amara reservation";
	const message = accepted
		? `Good news! Your reservation for ${roomType} on ${checkIn} has been accepted.`
		: `Your reservation for ${roomType} on ${checkIn} was not accepted. Please contact Hacienda Amara for assistance.`;

	const response = await fetch("https://send.api.mailtrap.io/api/send", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.MAILTRAP_API_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: { email: process.env.MAILTRAP_FROM_EMAIL, name: "Hacienda Amara" },
			to: [{ email, name }],
			subject,
			text: `Hello ${name},\n\n${message}\n\nHacienda Amara Private Resort`,
			html: `<p>Hello ${escapeHtml(name)},</p><p>${escapeHtml(message)}</p><p>Hacienda Amara Private Resort</p>`,
		}),
	});

	if (!response.ok) {
		return Response.json({ error: "Email provider rejected the notification." }, { status: 502 });
	}

	return Response.json({ sent: true });
}
