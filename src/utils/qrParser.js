// Classifies the text decoded from a scanned QR code.
//
// Returned shapes:
//   { type: "event",       id }          -> /view-event/:id (or /edit-event/:id)
//   { type: "reservation", id }          -> /customer-notifications/:id (guest booking pass)
//   { type: "booking" }                  -> /rooms (the public "scan to book" QR)
//   { type: "uuid",        id }          -> bare UUID, could be a reservation or an event
//   { type: "text",        id }          -> bare non-URL text, treated as a possible event id
//   { type: "external",    url }         -> URL on another website (never opened automatically)
//   { type: "unknown",     reason }      -> anything we cannot use

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const isUuid = (value) => UUID_RE.test(String(value || "").trim());

export function parseScannedQr(rawText, currentOrigin) {
	const text = String(rawText ?? "").trim();
	if (!text) return { type: "unknown", reason: "empty" };

	if (isUuid(text)) return { type: "uuid", id: text.toLowerCase() };

	if (/^https?:\/\//i.test(text)) {
		let url;
		try {
			url = new URL(text);
		} catch {
			return { type: "unknown", reason: "bad-url" };
		}

		if (currentOrigin && url.origin !== currentOrigin) {
			return { type: "external", url: url.href };
		}

		const path = url.pathname.replace(/\/+$/, "") || "/";

		const eventMatch = path.match(/^\/(?:view|edit)-event\/([^/]+)$/);
		if (eventMatch) {
			const id = decodeURIComponent(eventMatch[1]);
			return SAFE_ID_RE.test(id)
				? { type: "event", id }
				: { type: "unknown", reason: "bad-event-id" };
		}

		const reservationMatch = path.match(/^\/customer-notifications\/([^/]+)$/);
		if (reservationMatch) {
			const id = decodeURIComponent(reservationMatch[1]);
			return isUuid(id)
				? { type: "reservation", id: id.toLowerCase() }
				: { type: "unknown", reason: "bad-reservation-id" };
		}

		if (path === "/rooms") return { type: "booking" };

		return { type: "unknown", reason: "unsupported-path" };
	}

	// Plain text: older event QR codes may contain just the event id.
	if (SAFE_ID_RE.test(text)) return { type: "text", id: text };

	return { type: "unknown", reason: "unrecognized" };
}
