import nodemailer from "nodemailer";

export async function sendSecurityDepositRefundEmail(reservation, refund) {
	if (!["pending", "succeeded"].includes(refund?.status) || !refund.refundId) {
		return { sent: false, skipped: true };
	}

	const email = String(reservation.guest_email || reservation.profiles?.email || "").trim();
	if (!email) throw new Error("No guest email is available for the refund notification.");
	if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
		throw new Error("Gmail refund notifications are not configured.");
	}

	const name = String(
		reservation.guest_name
		|| [reservation.profiles?.firstname, reservation.profiles?.lastname].filter(Boolean).join(" ")
		|| "Guest",
	).trim();
	const amount = Number(reservation.security_deposit_amount).toLocaleString("en-PH");
	const booking = `${reservation.room_type || "reservation"} on ${reservation.check_in || "your selected date"}`;
	const completed = refund.status === "succeeded";
	const subject = completed
		? "Your Hacienda Amara security deposit has been refunded"
		: "Your Hacienda Amara security deposit refund is processing";
	const message = completed
		? `Your refundable security deposit of ₱${amount} for your ${booking} has been refunded to your original payment method. Your non-refundable down payment and any paid balance are not included in this refund.`
		: `Your refundable security deposit refund of ₱${amount} for your ${booking} has been submitted to PayMongo and is processing. Your non-refundable down payment and any paid balance are not included in this refund. Your bank or wallet may take additional time to show the refund.`;

	const transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		auth: {
			user: process.env.GMAIL_USER,
			pass: process.env.GMAIL_APP_PASSWORD,
		},
	});

	await transporter.sendMail({
		from: { name: "Hacienda Amara", address: process.env.GMAIL_USER },
		to: { name, address: email },
		subject,
		text: `Hello ${name},\n\n${message}\n\nHacienda Amara Private Resort`,
		html: `<p>Hello ${escapeHtml(name)},</p><p>${escapeHtml(message)}</p><p>Hacienda Amara Private Resort</p>`,
	});

	return { sent: true };
}

const escapeHtml = (value) =>
	String(value || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
