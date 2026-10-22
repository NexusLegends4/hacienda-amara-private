const hasRefundablePayment = (reservation) =>
	["down_payment_paid", "fully_paid"].includes(reservation?.payment_status)
	&& Boolean(reservation?.paymongo_checkout_payment_id)
	&& reservation?.security_deposit_refund_status === "not_requested"
	&& Number(reservation?.security_deposit_amount) > 0;

export const shouldShowSecurityDepositRefund = (reservation, today) => {
	const hasDeposit = Number(reservation?.security_deposit_amount) > 0
		&& reservation?.security_deposit_refund_status === "not_requested";
	if (!hasDeposit) return false;

	if (["denied", "cancelled"].includes(reservation.status)) return true;

	return hasRefundablePayment(reservation)
		&& reservation.status === "confirmed"
		&& String(reservation.check_out) <= today;
};

export const canRefundSecurityDeposit = (reservation, today) => {
	if (!hasRefundablePayment(reservation)) return false;

	if (["denied", "cancelled"].includes(reservation.status)) return true;

	return reservation.status === "confirmed" && String(reservation.check_out) <= today;
};
