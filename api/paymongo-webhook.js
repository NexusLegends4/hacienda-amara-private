import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { refundSecurityDeposit } from "../server/utils/security-deposit-refund.js";

const json = (body, status = 200) => Response.json(body, { status });

const hasValidSignature = (rawBody, signatureHeader, webhookSecret) => {
	const parts = Object.fromEntries(
		String(signatureHeader || "")
			.split(",")
			.map((part) => part.trim().split("=", 2))
			.filter(([key, value]) => key && value),
	);
	const timestamp = parts.t;
	const signatures = [parts.te, parts.li].filter((signature) => /^[a-f0-9]+$/i.test(signature || ""));
	const timestampSeconds = Number(timestamp);
	if (
		!timestamp ||
		!Number.isFinite(timestampSeconds) ||
		Math.abs(Date.now() / 1000 - timestampSeconds) > 300 ||
		!signatures.length
	) return false;
	const expected = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
	const expectedBuffer = Buffer.from(expected, "hex");
	return signatures.some((signature) => {
		const actualBuffer = Buffer.from(signature, "hex");
		return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
	});
};

export async function POST(request) {
	const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
		console.error("PayMongo webhook configuration is missing.");
		return json({ error: "Webhook is not configured." }, 503);
	}

	const rawBody = await request.text();
	if (!hasValidSignature(rawBody, request.headers.get("paymongo-signature"), webhookSecret)) {
		return json({ error: "Invalid webhook signature." }, 401);
	}

	let event;
	try {
		event = JSON.parse(rawBody);
	} catch {
		return json({ error: "Invalid webhook body." }, 400);
	}

	const eventType = event?.data?.attributes?.type || event?.data?.type;
	const eventData = event?.data?.attributes?.data || event?.data?.data;
	if (eventType !== "checkout_session.payment.paid") {
		return json({ received: true });
	}
	const sessionId = eventData?.id;
	const reservationId = eventData?.attributes?.reference_number;
	if (!sessionId || !reservationId) {
		return json({ error: "Paid checkout event is missing its booking reference." }, 400);
	}
	const paidPayment = eventData?.attributes?.payments?.find(
		(payment) => payment?.attributes?.status === "paid",
	);
	if (!paidPayment?.id) {
		console.error("PayMongo paid checkout event has no paid payment ID:", sessionId);
		return json({ error: "Paid checkout event is missing its payment reference." }, 503);
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { data: reservation, error: lookupError } = await supabase
		.from("reservations")
		.select("id, status, payment_status, down_payment_amount, security_deposit_amount, amount_paid, balance_due, paymongo_checkout_session_id, paymongo_balance_checkout_session_id, paymongo_checkout_payment_id, paymongo_balance_payment_id")
		.eq("id", reservationId)
		.maybeSingle();
	if (lookupError) {
		console.error("Unable to find booking for PayMongo webhook:", lookupError.code || lookupError.message);
		return json({ error: "Unable to process payment notification." }, 503);
	}
	if (!reservation || ![
		reservation.paymongo_checkout_session_id,
		reservation.paymongo_balance_checkout_session_id,
	].includes(sessionId)) {
		console.error("PayMongo webhook did not match a known booking:", sessionId);
		return json({ error: "Unknown checkout session." }, 404);
	}
	const isBalancePayment = reservation.paymongo_balance_checkout_session_id === sessionId;
	const paymentIdColumn = isBalancePayment
		? "paymongo_balance_payment_id"
		: "paymongo_checkout_payment_id";
	const existingPaymentId = isBalancePayment
		? reservation.paymongo_balance_payment_id
		: reservation.paymongo_checkout_payment_id;
	if (existingPaymentId && existingPaymentId !== paidPayment.id) {
		console.error("PayMongo checkout session produced an unexpected payment ID:", sessionId);
		return json({ error: "Payment reference does not match this checkout session." }, 409);
	}
	if (!existingPaymentId) {
		const { error: paymentIdError } = await supabase
			.from("reservations")
			.update({ [paymentIdColumn]: paidPayment.id })
			.eq("id", reservation.id)
			.eq(isBalancePayment ? "paymongo_balance_checkout_session_id" : "paymongo_checkout_session_id", sessionId)
			.is(paymentIdColumn, null);
		if (paymentIdError) {
			console.error("Unable to save PayMongo payment reference:", paymentIdError.code || "unknown error");
			return json({ error: "Unable to record payment reference." }, 503);
		}
	}
	if (reservation.payment_status === "fully_paid" || (isBalancePayment && reservation.payment_status !== "down_payment_paid")) {
		if (!isBalancePayment && reservation.status === "cancelled") {
			await refundSecurityDeposit(
				supabase,
				{ ...reservation, paymongo_checkout_payment_id: paidPayment.id },
				process.env.PAYMONGO_SECRET_KEY,
				`Security deposit refund for cancelled reservation ${reservation.id}`,
			);
		}
		return json({ received: true });
	}

	const paymentUpdate = isBalancePayment
		? {
			payment_status: "fully_paid",
			amount_paid: Number(reservation.amount_paid) + Number(reservation.balance_due),
			balance_paid_at: new Date().toISOString(),
			paymongo_balance_payment_id: paidPayment.id,
		}
		: {
			payment_status: "down_payment_paid",
			amount_paid: Number(reservation.down_payment_amount) + Number(reservation.security_deposit_amount),
			payment_confirmed_at: new Date().toISOString(),
			paymongo_checkout_payment_id: paidPayment.id,
		};
	const { error: updateError } = await supabase
		.from("reservations")
		.update(paymentUpdate)
		.eq("id", reservation.id)
		.eq(isBalancePayment ? "paymongo_balance_checkout_session_id" : "paymongo_checkout_session_id", sessionId)
		.eq("payment_status", isBalancePayment ? "down_payment_paid" : "checkout_pending");
	if (updateError) {
		console.error("Unable to record confirmed PayMongo payment:", updateError.code || updateError.message);
		return json({ error: "Unable to record payment confirmation." }, 503);
	}
	if (!isBalancePayment && reservation.status === "cancelled") {
		await refundSecurityDeposit(
			supabase,
			{ ...reservation, paymongo_checkout_payment_id: paidPayment.id },
			process.env.PAYMONGO_SECRET_KEY,
			`Security deposit refund for cancelled reservation ${reservation.id}`,
		);
	}

	return json({ received: true });
}
