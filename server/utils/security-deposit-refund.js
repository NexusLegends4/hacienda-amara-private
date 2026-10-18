const REFUND_API_URL = "https://api.paymongo.com/v1/refunds";

async function markManualReview(supabase, reservationId) {
	const { error } = await supabase
		.from("reservations")
		.update({ security_deposit_refund_status: "manual_review" })
		.eq("id", reservationId)
		.eq("security_deposit_refund_status", "not_requested");
	if (error) {
		console.error("Unable to mark security deposit refund for manual review:", error.code || "unknown error", reservationId);
	}
	return { status: "manual_review" };
}

export async function refundSecurityDeposit(supabase, reservation, secretKey, notes) {
	const refundAmount = Math.round(Number(reservation.security_deposit_amount) * 100);
	const paymentId = reservation.paymongo_checkout_payment_id;

	if (!["down_payment_paid", "fully_paid"].includes(reservation.payment_status)) {
		return { status: "not_eligible" };
	}
	if (!Number.isInteger(refundAmount) || refundAmount < 100) {
		console.error("Invalid security deposit amount for PayMongo refund:", reservation.id);
		return markManualReview(supabase, reservation.id);
	}
	if (!paymentId) {
		console.error("PayMongo payment ID is missing for security deposit refund:", reservation.id);
		return markManualReview(supabase, reservation.id);
	}
	if (!secretKey) {
		console.error("PayMongo refund is not configured for reservation:", reservation.id);
		return markManualReview(supabase, reservation.id);
	}

	const { data: claimed, error: claimError } = await supabase
		.from("reservations")
		.update({ security_deposit_refund_status: "processing" })
		.eq("id", reservation.id)
		.eq("security_deposit_refund_status", "not_requested")
		.eq("paymongo_checkout_payment_id", paymentId)
		.in("payment_status", ["down_payment_paid", "fully_paid"])
		.select("id")
		.maybeSingle();

	if (claimError) {
		console.error("Unable to claim security deposit refund:", claimError.code || "unknown error");
		return { status: "manual_review" };
	}
	if (!claimed) {
		const { data: current, error: currentError } = await supabase
			.from("reservations")
			.select("security_deposit_refund_status")
			.eq("id", reservation.id)
			.maybeSingle();
		if (currentError) {
			console.error("Unable to read security deposit refund status:", currentError.code || "unknown error");
			return { status: "manual_review" };
		}
		return { status: current?.security_deposit_refund_status || "manual_review" };
	}

	let response;
	try {
		response = await fetch(REFUND_API_URL, {
			method: "POST",
			headers: {
				Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				data: {
					attributes: {
						amount: refundAmount,
						payment_id: paymentId,
						reason: "requested_by_customer",
						notes: String(notes).slice(0, 255),
					},
				},
			}),
		});
	} catch (error) {
		console.error(
			"PayMongo refund request failed before confirmation:",
			reservation.id,
			error instanceof Error ? error.message : "unknown network error",
		);
		const { error: statusError } = await supabase
			.from("reservations")
			.update({ security_deposit_refund_status: "manual_review" })
			.eq("id", reservation.id)
			.eq("security_deposit_refund_status", "processing");
		if (statusError) {
			console.error("Unable to save refund review status:", statusError.code || "unknown error", reservation.id);
		}
		return { status: "manual_review" };
	}

	let result;
	try {
		result = await response.json();
	} catch {
		console.error("PayMongo refund returned invalid JSON:", response.status);
		const { error: statusError } = await supabase
			.from("reservations")
			.update({ security_deposit_refund_status: "manual_review" })
			.eq("id", reservation.id)
			.eq("security_deposit_refund_status", "processing");
		if (statusError) {
			console.error("Unable to save refund review status:", statusError.code || "unknown error", reservation.id);
		}
		return { status: "manual_review" };
	}

	const refund = result?.data;
	const providerStatus = refund?.attributes?.status;
	const refundStatus = providerStatus === "succeeded"
		? "succeeded"
		: providerStatus === "pending"
			? "pending"
			: "manual_review";
	if (
		!response.ok ||
		!refund?.id ||
		refund.attributes?.payment_id !== paymentId ||
		Number(refund.attributes?.amount) !== refundAmount
	) {
		console.error(
			"PayMongo refund was not accepted:",
			response.status,
			result?.errors?.[0]?.code || "unknown error",
			reservation.id,
		);
		const { error: statusError } = await supabase
			.from("reservations")
			.update({ security_deposit_refund_status: "manual_review" })
			.eq("id", reservation.id)
			.eq("security_deposit_refund_status", "processing");
		if (statusError) {
			console.error("Unable to save refund review status:", statusError.code || "unknown error", reservation.id);
		}
		return { status: "manual_review" };
	}

	const { error: saveError } = await supabase
		.from("reservations")
		.update({
			security_deposit_refund_status: refundStatus,
			paymongo_security_deposit_refund_id: refund.id,
			security_deposit_refund_requested_at: new Date().toISOString(),
		})
		.eq("id", reservation.id)
		.eq("security_deposit_refund_status", "processing");
	if (saveError) {
		console.error("Unable to save PayMongo refund details:", saveError.code || "unknown error", reservation.id);
		return { status: "manual_review" };
	}

	return { status: refundStatus, refundId: refund.id };
}
