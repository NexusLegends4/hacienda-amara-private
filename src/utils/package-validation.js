export const MAX_PACKAGE_PRICE = 10_000_000;

export function validatePackagePricing({ base_price, min_price, max_price, additional_guest_price }) {
	const rawPrices = [base_price, min_price, max_price, additional_guest_price];
	if (rawPrices.some((value) => String(value ?? "").trim() === "")) {
		return "Enter a value for every price.";
	}

	const prices = rawPrices.map(Number);
	if (prices.some((price) => !Number.isFinite(price) || price < 0 || price > MAX_PACKAGE_PRICE || !Number.isInteger(price))) {
		return `Prices must be whole numbers from ₱0 to ₱${MAX_PACKAGE_PRICE.toLocaleString()}.`;
	}
	if (Number(min_price) > Number(max_price)) {
		return "Minimum price cannot be higher than maximum price.";
	}
	return "";
}
