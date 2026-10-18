export const isGmailAddress = (email) =>
	/^[a-z0-9._%+-]+@gmail\.com$/i.test(String(email || "").trim());

export const normalizePhilippineMobileNumber = (phone) =>
	String(phone || "").trim().replace(/[\s()-]/g, "");

export const isPhilippineMobileNumber = (phone) =>
	/^\+639\d{9}$/.test(normalizePhilippineMobileNumber(phone));

export const getPhilippineMobileNumberForInput = (phone) => {
	const normalized = normalizePhilippineMobileNumber(phone);
	if (/^09\d{9}$/.test(normalized)) return `+63${normalized.slice(1)}`;
	if (/^639\d{9}$/.test(normalized)) return `+${normalized}`;
	return normalized;
};
