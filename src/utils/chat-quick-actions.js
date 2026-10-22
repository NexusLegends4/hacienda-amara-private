// Hacienda Amara Chat — System quick actions
// Buttons that jump to real pages/features of the Hacienda Amara system so
// clients never have to guess keywords. `type: "nav"` opens a page,
// `type: "ask"` sends a question to the assistant.

export const QUICK_ACTION_GROUPS = {
	CLIENT: [
		{ id: "book-room", label: "Book a Venue", type: "nav", to: "/rooms" },
		{ id: "view-packages", label: "Packages & Rates", type: "nav", to: "/room-pricing" },
		{ id: "book-day", label: "Reserve Day Time", type: "nav", to: "/rooms?package=Day%20Time" },
		{ id: "book-night", label: "Reserve Night Time", type: "nav", to: "/rooms?package=Night%20Time" },
		{ id: "book-overnight", label: "Reserve Overnight", type: "nav", to: "/rooms?package=Overnight" },
		{ id: "browse-events", label: "Browse Events", type: "nav", to: "/events" },
		{ id: "guest-reviews", label: "Guest Reviews", type: "nav", to: "/reviews" },
		{ id: "house-rules", label: "House Rules", type: "nav", to: "/rules" },
		{ id: "about-venue", label: "About the Venue", type: "nav", to: "/about" },
		{ id: "my-notifications", label: "My Bookings", type: "nav", to: "/client-notifications" },
		{ id: "facebook-page", label: "Facebook Page", type: "nav", to: "/facebook-qr" },
		{ id: "post-review", label: "Leave a Review", type: "nav", to: "/post-review" },
	],
	STAFF: [
		{ id: "manage-reservations", label: "Manage Reservations", type: "nav", to: "/manage-reservations", icon: "calendar" },
		{ id: "admin-reservations", label: "Booking Calendar", type: "nav", to: "/admin-reservations", icon: "grid" },
		{ id: "manage-events", label: "Manage Events", type: "nav", to: "/manage-events", icon: "sparkles" },
		{ id: "manage-packages", label: "Manage Packages", type: "nav", to: "/manage-packages", icon: "tag" },
		{ id: "manage-clients", label: "Manage Clients", type: "nav", to: "/manage-clients", icon: "users" },
		{ id: "scan-qr", label: "Scan QR", type: "nav", to: "/scan-qr", icon: "scan" },
		{ id: "booking-analytics", label: "Booking Analytics", type: "nav", to: "/booking-analytics", icon: "chart" },
		{ id: "announcements", label: "Announcements", type: "nav", to: "/manage-announcements", icon: "megaphone" },
		{ id: "admin-notifications", label: "Notifications", type: "nav", to: "/admin-notifications", icon: "bell" },
	],
};

// Questions that are answered instantly by the assistant (rule-based FAQ).
export const QUICK_QUESTIONS = [
	{ id: "q-rates", label: "How much is it?", type: "ask", prompt: "What are the rates?" },
	{ id: "q-availability", label: "Is my date available?", type: "ask", prompt: "Check availability" },	{ id: "q-amenities", label: "What's included?", type: "ask", prompt: "What are the inclusions?" },
	{ id: "q-booking", label: "How do I book?", type: "ask", prompt: "How do I book?" },
	{ id: "q-payment", label: "How do I pay?", type: "ask", prompt: "How do I pay?" },
	{ id: "q-location", label: "Where is it?", type: "ask", prompt: "Exact location please" },
	{ id: "q-checkin", label: "Check-in time?", type: "ask", prompt: "What are the check-in and check-out times?" },
	{ id: "q-pool", label: "Pool details", type: "ask", prompt: "Tell me about the pool" },
	{ id: "q-room", label: "Room details", type: "ask", prompt: "What's in the barkada room?" },
	{ id: "q-kitchen", label: "Kitchen & cooking", type: "ask", prompt: "What kitchen equipment is available?" },
	{ id: "q-event", label: "Event setup help", type: "ask", prompt: "Do you help with event setup?" },
	{ id: "q-pax", label: "Extra guest cost", type: "ask", prompt: "How much for extra guests?" },
	{ id: "q-visit", label: "Can I visit first?", type: "ask", prompt: "Can I schedule a site visit?" },
	{ id: "q-pets", label: "Are pets allowed?", type: "ask", prompt: "Are pets allowed?" },
	{ id: "q-parking", label: "Parking?", type: "ask", prompt: "Is parking available?" },
	{ id: "q-cancel", label: "Cancellation policy", type: "ask", prompt: "What is the cancellation policy?" },
];

export const getQuickActionsForRole = (role) =>
	role === "admin" || role === "staff" ? QUICK_ACTION_GROUPS.STAFF : QUICK_ACTION_GROUPS.CLIENT;
