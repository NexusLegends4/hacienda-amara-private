import { createClient } from "@supabase/supabase-js";
import { calculateBookingTotal } from "../src/utils/booking-pricing.js";
import { isGmailAddress } from "../src/utils/contact-validation.js";

const SECURITY_DEPOSIT_PHP = 2_000;

const json = (body, status = 200) => Response.json(body, { status });

const getExpectedTotal = (reservation, pkg) => {
	const total = calculateBookingTotal(reservation.check_in, pkg, reservation.guests);
	return Number.isFinite(total) ? total : null;
};

export async function POST(request) {
	const secretKey = process.env.PAYMONGO_SECRET_KEY;
	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!secretKey || !supabaseUrl || !serviceRoleKey) {
		return json({ error: "PayMongo checkout is not configured on the server." }, 503);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid request body." }, 400);
	}

	const reservationId = String(body?.reservationId || "");
	const email = String(body?.email || "").trim().toLowerCase();
	const paymentType = body?.paymentType === "balance" ? "balance" : "deposit";
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId) || !isGmailAddress(email)) {
		return json({ error: "A valid booking reference and Gmail booking email are required." }, 400);
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { data: reservation, error: reservationError } = await supabase
		.from("reservations")
		.select("id, guest_email, check_in, room_type, guests, total_price, status, payment_status, down_payment_amount, security_deposit_amount, balance_due, amount_paid, paymongo_checkout_session_id, paymongo_checkout_url, paymongo_balance_checkout_session_id, paymongo_balance_checkout_url")
		.eq("id", reservationId)
		.is("profile_id", null)
		.maybeSingle();
	if (reservationError) {
		console.error("Unable to load reservation for PayMongo checkout:", reservationError.code || reservationError.message);
		return json({ error: "Unable to load this booking. Please try again later." }, 503);
	}
	if (
		!reservation ||
		String(reservation.guest_email || "").trim().toLowerCase() !== email ||
		["cancelled", "denied", "rejected"].includes(String(reservation.status).toLowerCase())
	) {
		return json({ error: "This booking could not be found or is no longer active." }, 404);
	}
	if (paymentType === "deposit" && ["down_payment_paid", "fully_paid"].includes(reservation.payment_status)) {
		return json({ error: "The down payment and security deposit have already been received." }, 409);
	}
	if (paymentType === "balance" && reservation.payment_status !== "down_payment_paid") {
		return json({ error: reservation.payment_status === "fully_paid" ? "The booking balance has already been paid." : "Pay the down payment and security deposit before paying the balance." }, 409);
	}
	const existingCheckoutUrl = paymentType === "balance"
		? reservation.paymongo_balance_checkout_url
		: reservation.paymongo_checkout_url;
	const existingCheckoutId = paymentType === "balance"
		? reservation.paymongo_balance_checkout_session_id
		: reservation.paymongo_checkout_session_id;
	if (existingCheckoutUrl && existingCheckoutId) {
		return json({ checkoutUrl: existingCheckoutUrl });
	}

	let expectedTotal;
	let downPayment;
	let balanceDue;
	let amountDue;
	if (paymentType === "deposit") {
		const { data: pkg, error: packageError } = await supabase
			.from("packages")
			.select("base_price, max_price, max_guests, additional_guest_price")
			.eq("name", reservation.room_type)
			.maybeSingle();
		if (packageError || !pkg) {
			console.error("Unable to load package for PayMongo checkout:", packageError?.code || packageError?.message || "not found");
			return json({ error: "Unable to verify this booking's price. Please contact resort staff." }, 503);
		}

		expectedTotal = getExpectedTotal(reservation, pkg);
		if (!expectedTotal || expectedTotal <= 0) {
			return json({ error: "This booking has an invalid price and cannot be paid online." }, 400);
		}
		downPayment = Math.round(expectedTotal * 50) / 100;
		balanceDue = Math.round((expectedTotal - downPayment) * 100) / 100;
		amountDue = Math.round((downPayment + SECURITY_DEPOSIT_PHP) * 100) / 100;
	} else {
		expectedTotal = Number(reservation.total_price);
		downPayment = Number(reservation.down_payment_amount);
		balanceDue = Number(reservation.balance_due);
		amountDue = balanceDue;
		if (!Number.isFinite(amountDue) || amountDue <= 0) {
			return json({ error: "This booking has no outstanding balance." }, 409);
		}
	}

	const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
	const notificationUrl = `${appUrl}/customer-notifications/${reservation.id}`;
	const paymentLabel = paymentType === "balance" ? "remaining balance" : "booking down payment and security deposit";
	let checkoutResponse;
	try {
		checkoutResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
			method: "POST",
			headers: {
				Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				data: {
					attributes: {
						line_items: [{
							name: `${reservation.room_type} ${paymentLabel}`,
							amount: Math.round(amountDue * 100),
							currency: "PHP",
							quantity: 1,
						}],
						payment_method_types: ["gcash", "card", "paymaya", "qrph"],
						success_url: `${notificationUrl}?payment=${paymentType === "balance" ? "balance_success" : "success"}`,
						cancel_url: `${notificationUrl}?payment=${paymentType === "balance" ? "balance_cancelled" : "cancelled"}`,
						reference_number: reservation.id,
					},
				},
			}),
		});
	} catch (error) {
		console.error("Unable to reach PayMongo checkout:", error instanceof Error ? error.message : "unknown network error");
		return json({ error: "PayMongo could not be reached. Check your connection and try checkout again." }, 502);
	}

	let checkout;
	try {
		checkout = await checkoutResponse.json();
	} catch {
		console.error("PayMongo returned a non-JSON checkout response:", checkoutResponse.status);
		return json({ error: "PayMongo could not start checkout. Please try again." }, 502);
	}
	const checkoutSession = checkout?.data;
	const checkoutUrl = checkoutSession?.attributes?.checkout_url;
	if (!checkoutResponse.ok || !checkoutSession?.id || !checkoutUrl) {
		console.error("PayMongo checkout creation failed:", checkoutResponse.status, checkout?.errors?.[0]?.code || "unknown error");
		return json({ error: checkout?.errors?.[0]?.detail || "PayMongo could not start checkout. Please try again." }, 502);
	}

	const paymentFields = paymentType === "balance"
		? {
			paymongo_balance_checkout_session_id: checkoutSession.id,
			paymongo_balance_checkout_url: checkoutUrl,
		}
		: {
			total_price: expectedTotal,
			down_payment_amount: downPayment,
			security_deposit_amount: SECURITY_DEPOSIT_PHP,
			balance_due: balanceDue,
			payment_status: "checkout_pending",
			initial_payment_deadline_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
			paymongo_checkout_session_id: checkoutSession.id,
			paymongo_checkout_url: checkoutUrl,
		};
	const { data: savedCheckout, error: updateError } = await supabase
		.from("reservations")
		.update(paymentFields)
		.eq("id", reservation.id)
		.eq("payment_status", paymentType === "balance" ? "down_payment_paid" : "unpaid")
		.select("id")
		.maybeSingle();
	if (updateError || !savedCheckout) {
		console.error("Unable to save PayMongo checkout details:", updateError?.code || updateError?.message || "booking state changed");
		return json({ error: "Checkout was created but could not be attached to this booking. Please contact resort staff." }, 503);
	}

	return json({ checkoutUrl });
}
