export const PH_HOLIDAYS_2026 = new Set([
	"2026-01-01", "2026-02-17", "2026-03-20", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-09",
	"2026-05-01", "2026-06-12", "2026-08-21", "2026-08-31", "2026-11-01", "2026-11-02",
	"2026-11-30", "2026-12-08", "2026-12-24", "2026-12-25", "2026-12-30", "2026-12-31",
]);

export const isWeekendOrHoliday = (dateString) => {
	if (!dateString) return false;
	const day = new Date(`${dateString}T00:00:00`).getDay();
	return [0, 5, 6].includes(day) || PH_HOLIDAYS_2026.has(dateString);
};

export const calculateBookingTotal = (dateString, pkg, guestCount) => {
	if (!dateString || !pkg) return 0;
	const extraGuests = Math.max(0, Number(guestCount) - Number(pkg.max_guests || 20));
	const basePrice = isWeekendOrHoliday(dateString)
		? Number(pkg.max_price || 0)
		: Number(pkg.base_price || 0);
	return basePrice + extraGuests * Number(pkg.additional_guest_price || 0);
};
