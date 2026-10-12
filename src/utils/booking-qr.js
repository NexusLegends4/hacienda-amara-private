const UUID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const parseBookingQr = (raw) => {
	const text = String(raw ?? "").trim();
	if (!text) return { type: "unknown" };

	if (UUID_ONLY.test(text)) return { type: "booking", id: text };

	if (/^https?:\/\//i.test(text)) {
		let url;
		try {
			url = new URL(text);
		} catch {
			return { type: "unknown" };
		}

		const bookingMatch = url.pathname.match(/^\/customer-notifications\/([^/]+)\/?$/);
		if (bookingMatch) {
			let id;
			try {
				id = decodeURIComponent(bookingMatch[1]);
			} catch {
				return { type: "unknown" };
			}
			if (UUID_ONLY.test(id)) return { type: "booking", id };
		}

		const eventMatch = url.pathname.match(/^\/(?:view|edit)-event\/([^/]+)\/?$/);
		if (eventMatch) return { type: "event", id: eventMatch[1], search: url.search };
	}

	return { type: "unknown" };
};

const isIsoDate = (value) => {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

const getManilaDate = (now) => {
	const parts = new Intl.DateTimeFormat("en", {
		timeZone: "Asia/Manila",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return `${values.year}-${values.month}-${values.day}`;
};

export const evaluateBooking = (reservation, now = new Date()) => {
	const status = String(reservation?.status || "pending").toLowerCase();
	const checkIn = reservation?.check_in;
	const checkOut = reservation?.check_out;

	if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkIn > checkOut) {
		return {
			tone: "error",
			title: "Booking details unavailable",
			detail: "The reservation has an invalid schedule. Verify it in Manage Reservations before admitting the guest.",
		};
	}

	if (["cancelled", "rejected"].includes(status)) {
		return {
			tone: "error",
			title: "Booking cancelled",
			detail: "This reservation was cancelled or declined. Do not admit.",
		};
	}
	if (!["confirmed", "accepted"].includes(status)) {
		return {
			tone: "warning",
			title: "Not accepted yet",
			detail: "This booking is still pending. Accept it in Manage Reservations before admitting the guest.",
		};
	}

	const today = getManilaDate(now);
	if (today < checkIn) {
		return {
			tone: "warning",
			title: "Too early",
			detail: `This booking is confirmed but starts on ${checkIn}.`,
		};
	}
	if (today > checkOut) {
		return {
			tone: "error",
			title: "Booking expired",
			detail: `This booking ended on ${checkOut}.`,
		};
	}
	return {
		tone: "success",
		title: "Valid booking",
		detail: "Confirmed and scheduled for today.",
	};
};
