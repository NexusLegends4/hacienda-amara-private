import { createClient } from "@supabase/supabase-js";
import { getVerifiedStaff } from "./utils/staff-auth.js";
import { refundSecurityDeposit } from "./utils/security-deposit-refund.js";

const json = (body, status = 200) => Response.json(body, { status });
const reservationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getPhilippineDate = () => {
	const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
		timeZone: "Asia/Manila",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date()).map(({ type, value }) => [type, value]));
	return `${parts.year}-${parts.month}-${parts.day}`;
};

export async function POST(request) {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const secretKey = process.env.PAYMONGO_SECRET_KEY;
	if (!supabaseUrl || !serviceRoleKey) {
		return json({ error: "Security deposit refunds are not configured on the server." }, 503);
	}

	let staff;
	try {
		staff = await getVerifiedStaff(request, supabaseUrl, serviceRoleKey);
	} catch (error) {
		console.error("Unable to verify security deposit refund request:", error instanceof Error ? error.message : "unknown error");
		return json({ error: "Unable to verify staff access." }, 503);
	}
	if (!staff) return json({ error: "Only MFA-verified staff or administrators can issue security deposit refunds." }, 403);

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid request body." }, 400);
	}
	const reservationId = String(body?.reservationId || "");
	if (!reservationIdPattern.test(reservationId)) return json({ error: "A valid reservation ID is required." }, 400);

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { data: reservation, error } = await supabase
		.from("reservations")
		.select("id, status, check_out, payment_status, security_deposit_amount, paymongo_checkout_payment_id, security_deposit_refund_status")
		.eq("id", reservationId)
		.maybeSingle();
	if (error) {
		console.error("Unable to load reservation for security deposit refund:", error.code || "unknown error");
		return json({ error: "Unable to load this reservation." }, 503);
	}
	if (!reservation) return json({ error: "Reservation not found." }, 404);
	if (reservation.status !== "confirmed") {
		return json({ error: "Only a completed, confirmed reservation can receive the post-check-out deposit refund." }, 409);
	}
	if (!["down_payment_paid", "fully_paid"].includes(reservation.payment_status)) {
		return json({ error: "No PayMongo payment is available to refund for this reservation." }, 409);
	}
	if (String(reservation.check_out) > getPhilippineDate()) {
		return json({ error: "The security deposit can only be refunded on or after the check-out date." }, 409);
	}
	if (reservation.security_deposit_refund_status !== "not_requested") {
		return json({
			error: `A security deposit refund is already ${reservation.security_deposit_refund_status.replaceAll("_", " ")}.`,
			refundStatus: reservation.security_deposit_refund_status,
		}, 409);
	}

	let refund;
	try {
		refund = await refundSecurityDeposit(
			supabase,
			reservation,
			secretKey,
			`Security deposit refund after check-out for reservation ${reservation.id}`,
		);
	} catch (refundError) {
		console.error(
			"Security deposit refund processing needs manual review:",
			reservation.id,
			refundError instanceof Error ? refundError.message : "unknown error",
		);
		return json({ refund: { status: "manual_review" } });
	}
	return json({ refund });
}
