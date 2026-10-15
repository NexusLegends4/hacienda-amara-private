import nodemailer from "nodemailer";
import { hasStaffVerificationClaim } from "../server/utils/auth.js";

const allowedStatuses = new Set(["confirmed", "denied", "cancelled"]);

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
	if (!hasStaffVerificationClaim(accessToken)) return null;

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

	const { name, email, status, roomType, checkIn, rejectionReason } = body || {};
	if (!name || !email || !allowedStatuses.has(status) || !roomType || !checkIn) {
		return Response.json({ error: "Missing or invalid reservation details." }, { status: 400 });
	}
	if (typeof rejectionReason !== "undefined" && (typeof rejectionReason !== "string" || rejectionReason.length > 300)) {
		return Response.json({ error: "Rejection reason must be 300 characters or fewer." }, { status: 400 });
	}

	if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
		return Response.json(
			{
				error: "Gmail email is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD in Vercel Project Settings > Environment Variables, then redeploy.",
			},
			{ status: 503 },
		);
	}

	const emailDetails = {
		confirmed: {
			subject: "Your Hacienda Amara reservation was accepted",
			message: `Good news! Your reservation for ${roomType} on ${checkIn} has been accepted.`,
		},
		denied: {
			subject: "Your Hacienda Amara reservation was denied",
			message: `Your reservation request for ${roomType} on ${checkIn} was denied.${rejectionReason?.trim() ? ` Reason: ${rejectionReason.trim()}` : " Please contact Hacienda Amara for assistance."}`,
		},
		cancelled: {
			subject: "Your Hacienda Amara reservation was cancelled",
			message: `Your accepted reservation for ${roomType} on ${checkIn} has been cancelled by Hacienda Amara. Please contact us if you have questions.`,
		},
	};
	const { subject, message } = emailDetails[status];

	const transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		auth: {
			user: process.env.GMAIL_USER,
			pass: process.env.GMAIL_APP_PASSWORD,
		},
	});

	try {
		await transporter.sendMail({
			from: { name: "Hacienda Amara", address: process.env.GMAIL_USER },
			to: { name, address: email },
			subject,
			text: `Hello ${name},\n\n${message}\n\nHacienda Amara Private Resort`,
			html: `<p>Hello ${escapeHtml(name)},</p><p>${escapeHtml(message)}</p><p>Hacienda Amara Private Resort</p>`,
		});
	} catch (error) {
		console.error("Gmail SMTP failed to send reservation notification:", error);
		return Response.json(
			{ error: "Gmail could not send the notification. Check the recipient and Gmail SMTP settings." },
			{ status: 502 },
		);
	}

	return Response.json({ sent: true });
}
