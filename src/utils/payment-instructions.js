export const MANUAL_PAYMENT_CHANNELS = [
	{
		name: "GCash",
		accountName: "Mara Jane Garcia",
		accountNumberLabel: "Mobile number",
		accountNumber: "09683260522",
	},
	{
		name: "BDO Unibank, Inc.",
		accountName: "Mara Jane Rosales-Garcia",
		accountNumberLabel: "Account number",
		accountNumber: "010160005035",
	},
];

const formatPaymentChannel = ({ name, accountName, accountNumberLabel, accountNumber }) =>
	`${name}\nAccount name: ${accountName}\n${accountNumberLabel}: ${accountNumber}`;

export const PAYMENT_INSTRUCTIONS = `Thank you for choosing Hacienda Amara Private Resort and Events Place.

To reserve and pay online, open the Book Your Experience page, submit your booking, then continue to the secure PayMongo checkout:
- A 50% down payment (at least half of the booking total) plus a ₱2,000 refundable security deposit are required. After payment is received, resort staff will review and accept or deny your reservation.
- Pay the remaining balance from your private reservation page at least one day before your stay.
- The down payment is non-refundable.
- When a paid reservation is cancelled, only the ₱2,000 security deposit is submitted for refund; the down payment and any paid balance are not included.
- For a completed stay, resort staff submits the ₱2,000 security-deposit refund after check-out and inspection.
- PayMongo refund timing depends on the payment method: GCash and Maya are typically within 24 hours, QR Ph refunds for payments under ₱50,000 are typically real-time, and card refunds can take up to 30 days. Maya partial refunds may only be submitted starting the day after payment. Your bank or wallet may take additional time to show the refund.
- PayMongo processing fees are not returned to the resort when a refund is issued.

Rates are good for 20 pax. Each additional guest is ₱200. Children 8 years old and below are free.

PayMongo checkout is linked to your booking. The chat cannot create or verify a booking payment; do not send your PIN or OTP to anyone. If you need to use a bank transfer instead, contact authorized resort staff and attach the receipt in this chat for manual staff verification.

Manual transfer details:
${MANUAL_PAYMENT_CHANNELS.map(formatPaymentChannel).join("\n\n")}

A contract will be provided once payment has been confirmed and resort staff has accepted the booking.`;

export const PAYMENT_DETAILS_ONLY = `Manual transfer details:
${MANUAL_PAYMENT_CHANNELS.map(formatPaymentChannel).join("\n\n")}`;

const PAYMENT_QUERY_TERMS = [
	"payment",
	"pay",
	"bayad",
	"magbabayad",
	"gcash",
	"bdo",
	"down payment",
	"downpayment",
	"security deposit",
	"deposit",
	"reserve the date",
	"how to book",
	"how to reserve",
	"booking process",
	"reservation process",
	"how to make a reservation",
	"confirm booking",
	"hot to book",
	"hot to reserve",
	"ho to book",
	"ho to reserve",
	"howto book",
	"howto reserve"
];

export const isPaymentInstructionsQuery = (text) => {
	const normalizedText = String(text || "").toLowerCase();
	return PAYMENT_QUERY_TERMS.some((term) => normalizedText.includes(term));
};
