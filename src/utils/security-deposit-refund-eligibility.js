export const canRefundSecurityDeposit = (reservation, today) => {
	if (
		!reservation ||
		!["down_payment_paid", "fully_paid"].includes(reservation?.payment_status) ||
		reservation?.security_deposit_refund_status !== "not_requested" ||
		Number(reservation?.security_deposit_amount) <= 0
	) {
		return false;
	}

	if (reservation.status === "denied") {
		return Boolean(reservation.late_payment_received_at);
	}

	return reservation.status === "confirmed" && String(reservation.check_out) <= today;
};
