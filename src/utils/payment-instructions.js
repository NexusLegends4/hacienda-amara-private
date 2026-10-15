export const PAYMENT_INSTRUCTIONS = `Thank you for choosing Hacienda Amara Private Resort and Events Place.

To reserve a date:
- A 50% down payment and a ₱2,000 refundable security deposit are required to confirm your booking.
- The remaining balance must be settled at least one day before your stay.
- The down payment is non-refundable.
- The security deposit is refundable upon check-out.

Rates are good for 20 pax. Each additional guest is ₱200. Children 8 years old and below are free.

Payments can be made through:

GCash
Account name: Mara Jane Garcia
Mobile number: 09683260522

BDO Unibank, Inc.
Account name: Mara Jane Rosales-Garcia
Account number: 010160005035

A contract will be provided once payment has been confirmed. After transferring, attach your payment receipt in this chat for manual staff verification. Your booking is confirmed only after Hacienda Amara staff confirms receipt. Never share your PIN or OTP.`;

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
