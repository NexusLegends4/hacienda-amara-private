import { createClient } from "@supabase/supabase-js";
import { getVerifiedStaff } from "../server/utils/staff-auth.js";
import { refundSecurityDeposit } from "../server/utils/security-deposit-refund.js";
import { sendSecurityDepositRefundEmail } from "../server/utils/security-deposit-refund-email.js";
import { canRefundSecurityDeposit } from "../src/utils/security-deposit-refund-eligibility.js";
import {
	isGmailAddress,
	isPhilippineMobileNumber,
	getPhilippineMobileNumberForInput,
	normalizePhilippineMobileNumber,
} from "../src/utils/contact-validation.js";

const json = (body, status = 200) => Response.json(body, { status });
const reservationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reservationFields = [
	"id",
	"status",
	"guest_email",
	"guest_name",
	"guest_phone",
	"room_type",
	"check_in",
	"check_out",
	"payment_status",
	"security_deposit_amount",
	"paymongo_checkout_payment_id",
	"security_deposit_refund_status",
	"profiles(email, firstname, lastname)",
].join(", ");

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
	if (!supabaseUrl || !serviceRoleKey) {
		return json({ error: "Reservation cancellation is not configured on the server." }, 503);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid request body." }, 400);
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	if (body?.action === "refund_security_deposit") {
		let staff;
		try {
			staff = await getVerifiedStaff(request, supabaseUrl, serviceRoleKey);
		} catch (error) {
			console.error("Unable to verify security deposit refund request:", error instanceof Error ? error.message : "unknown error");
			return json({ error: "Unable to verify staff access." }, 503);
		}
		if (!staff) {
			return json({ error: "Only MFA-verified staff or administrators can issue security deposit refunds." }, 403);
		}

		const reservationId = String(body?.reservationId || "");
		if (!reservationIdPattern.test(reservationId)) {
			return json({ error: "A valid reservation ID is required." }, 400);
		}
		const { data: reservation, error } = await supabase
			.from("reservations")
			.select(reservationFields)
			.eq("id", reservationId)
			.maybeSingle();
		if (error) {
			console.error("Unable to load reservation for security deposit refund:", error.code || "unknown error");
			return json({ error: "Unable to load this reservation." }, 503);
		}
		if (!reservation) return json({ error: "Reservation not found." }, 404);
		if (!["down_payment_paid", "fully_paid"].includes(reservation.payment_status)) {
			return json({ error: "No PayMongo payment is available to refund for this reservation." }, 409);
		}
		if (!canRefundSecurityDeposit(reservation, getPhilippineDate())) {
			return json({
				error: reservation.status === "confirmed"
					? "The security deposit can only be refunded on or after the check-out date."
					: "A recorded PayMongo payment and unrequested security deposit refund are required.",
			}, 409);
		}
		if (reservation.security_deposit_refund_status !== "not_requested") {
			return json({
				error: `A security deposit refund is already ${reservation.security_deposit_refund_status.replaceAll("_", " ")}.`,
				refundStatus: reservation.security_deposit_refund_status,
			}, 409);
		}

		try {
			const refund = await refundSecurityDeposit(
				supabase,
				reservation,
				process.env.PAYMONGO_SECRET_KEY,
				`Security deposit refund for ${reservation.status} reservation ${reservation.id}`,
			);
			let refundEmailSent = false;
			if (refund.refundId) {
				try {
					await sendSecurityDepositRefundEmail(reservation, refund);
					refundEmailSent = true;
				} catch (emailError) {
					console.error(
						"Security deposit refund was issued but its guest email could not be sent:",
						reservation.id,
						emailError instanceof Error ? emailError.message : "unknown error",
					);
				}
			}
			return json({ refund, refundEmailSent });
		} catch (refundError) {
			console.error(
				"Security deposit refund processing needs manual review:",
				reservation.id,
				refundError instanceof Error ? refundError.message : "unknown error",
			);
			return json({ refund: { status: "manual_review" } });
		}
	}

	const authorization = request.headers.get("authorization");
	let reservation;

	if (authorization) {
		let staff;
		try {
			staff = await getVerifiedStaff(request, supabaseUrl, serviceRoleKey);
		} catch (error) {
			console.error("Unable to verify staff cancellation request:", error instanceof Error ? error.message : "unknown error");
			return json({ error: "Unable to verify staff access." }, 503);
		}
		if (!staff) return json({ error: "Only MFA-verified staff or administrators can cancel this reservation." }, 403);

		const id = String(body?.reservationId || "");
		if (!reservationIdPattern.test(id)) return json({ error: "A valid reservation ID is required." }, 400);
		const { data, error } = await supabase
			.from("reservations")
			.select(reservationFields)
			.eq("id", id)
			.maybeSingle();
		if (error) {
			console.error("Unable to load reservation for staff cancellation:", error.code || "unknown error");
			return json({ error: "Unable to load this reservation." }, 503);
		}
		reservation = data;
	} else {
		const email = String(body?.email || "").trim().toLowerCase();
		const phone = normalizePhilippineMobileNumber(body?.phone);
		const checkIn = String(body?.checkIn || "");
		if (!isGmailAddress(email) || !isPhilippineMobileNumber(phone) || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
			return json({ error: "Use the booking Gmail address, an 11-digit Philippine mobile number starting with 09, and the reservation date." }, 400);
		}
		const { data, error } = await supabase
			.from("reservations")
			.select(reservationFields)
			.eq("check_in", checkIn)
			.in("status", ["pending", "confirmed"]);
		if (error) {
			console.error("Unable to find guest reservation for cancellation:", error.code || "unknown error");
			return json({ error: "Unable to load this reservation." }, 503);
		}
		const matches = (data || []).filter((candidate) =>
			String(candidate.guest_email || "").trim().toLowerCase() === email &&
			getPhilippineMobileNumberForInput(candidate.guest_phone) === phone,
		);
		if (matches.length > 1) {
			return json({ error: "More than one active reservation matched. Please contact resort staff." }, 409);
		}
		reservation = matches[0] || null;
	}

	const allowedStatuses = authorization ? ["confirmed"] : ["pending", "confirmed"];
	if (!reservation || !allowedStatuses.includes(String(reservation.status).toLowerCase())) {
		return json({ error: "No active reservation matched those details." }, 404);
	}

	const { data: cancelled, error: cancelError } = await supabase
		.from("reservations")
		.update({ status: "cancelled" })
		.eq("id", reservation.id)
		.eq("status", reservation.status)
		.select("id")
		.maybeSingle();
	if (cancelError || !cancelled) {
		console.error("Unable to cancel reservation:", cancelError?.code || "reservation changed");
		return json({ error: "The reservation could not be cancelled. Refresh and try again." }, 409);
	}

	let refund = { status: "not_requested" };
	let refundEmailSent = false;
	if (["down_payment_paid", "fully_paid"].includes(reservation.payment_status)) {
		try {
			refund = await refundSecurityDeposit(
				supabase,
				reservation,
				process.env.PAYMONGO_SECRET_KEY,
				`Security deposit refund for cancelled reservation ${reservation.id}`,
			);
			if (refund.refundId) {
				try {
					await sendSecurityDepositRefundEmail(reservation, refund);
					refundEmailSent = true;
				} catch (emailError) {
					console.error(
						"Reservation was cancelled and its refund was issued, but the guest email failed:",
						reservation.id,
						emailError instanceof Error ? emailError.message : "unknown error",
					);
				}
			}
		} catch (error) {
			console.error(
				"Reservation was cancelled, but refund processing needs manual review:",
				reservation.id,
				error instanceof Error ? error.message : "unknown error",
			);
			refund = { status: "manual_review" };
		}
	}

	return json({ cancelled: true, refund, refundEmailSent });
}
