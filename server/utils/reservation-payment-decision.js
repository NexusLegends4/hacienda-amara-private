export const getInitialPaymentDecision = (reservation, now = Date.now()) => {
	if (reservation.status === "denied") {
		return { status: "denied", late: true };
	}
	if (reservation.status !== "pending") {
		return { status: reservation.status, late: false };
	}

	const deadline = Date.parse(reservation.initial_payment_deadline_at || "");
	if (Number.isFinite(deadline) && deadline > now) {
		return { status: "confirmed", late: false };
	}
	return { status: "denied", late: true };
};
