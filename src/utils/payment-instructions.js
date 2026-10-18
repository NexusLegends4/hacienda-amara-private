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
- A 50% down payment (at least half of the booking total) plus a ₱2,000 refundable security deposit are required to confirm your booking.
- Pay the remaining balance from your private reservation page at least one day before your stay.
- The down payment is non-refundable.
- The security deposit is refunded upon check-out.

Rates are good for 20 pax. Each additional guest is ₱200. Children 8 years old and below are free.

PayMongo checkout is linked to your booking. The chat cannot create or verify a booking payment; do not send your PIN or OTP to anyone. If you need to use a bank transfer instead, contact authorized resort staff and attach the receipt in this chat for manual staff verification.

Manual transfer details:
${MANUAL_PAYMENT_CHANNELS.map(formatPaymentChannel).join("\n\n")}

A contract will be provided once payment has been confirmed. Your booking is confirmed only after Hacienda Amara staff confirms the reservation.`;

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
];

export const isPaymentInstructionsQuery = (text) => {
	const normalizedText = String(text || "").toLowerCase();
	return PAYMENT_QUERY_TERMS.some((term) => normalizedText.includes(term));
};
