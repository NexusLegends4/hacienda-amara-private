import { useContext, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate, NavLink } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { supabase } from "../utils/supabase";
import heroImage from "../assets/hero.png";
import DOMPurify from "dompurify";

const BROADCAST_CHANNEL = "hacienda-amara-support-room";
const HISTORY_STORAGE_KEY = "hacienda-amara-chat-history-v1";
const ADMIN_AVAILABILITY_KEY = "hacienda-amara-admin-available-v1";
const MEDIA_CONTENT_PREFIX = "__HACIENDA_MEDIA__";
const CHAT_MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_CHAT_MEDIA_BUCKET || "chat-media";
const HACIENDA_AMARA_ADDRESS =
	"B30 L12 Itneg Street Phase 3 Amityville Bgry. San Jose, Rodriguez, Rizal, Philippines, 1860";
const HACIENDA_AMARA_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
	HACIENDA_AMARA_ADDRESS,
)}`;
const HACIENDA_AMARA_FACEBOOK_URL = "https://www.facebook.com/HaciendaAmara/";
const HACIENDA_AMARA_FACEBOOK_QR_IMAGE = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
	HACIENDA_AMARA_FACEBOOK_URL,
)}`;
const HACIENDA_AMARA_PAYMENT_QR =
	"https://scontent.fmnl9-2.fna.fbcdn.net/v/t1.15752-9/586101388_4313457875643178_1323786050449359968_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeF8MCzKGVynPapvqPw66URbifWVdj1W1EKJ9ZV2PVbUQnWqOJyG40mBypc3lsyCOZtoN9UCBqYx5xKGy52kW7_b&_nc_ohc=iWoIMRjetowQ7kNvwE45bpj&_nc_oc=AdrLJu9v2kmxwQVcQozKQadNYjV8ueWaP-kB_vk6I9xYYhVbsIeyb0WOLCQFkBlZJRE&_nc_zt=23&_nc_ht=scontent.fmnl9-2.fna&_nc_ss=7a3a8&oh=03_Q7cD5AGLhx3iK6ZcKb8fL_FNAcsnYgOuhSDrzr6oen-MUaGdJg&oe=6A07D2D0";
const HACIENDA_AMARA_LOCATION_QR_IMAGE = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
	HACIENDA_AMARA_MAPS_URL,
)}`;
const HACIENDA_AMARA_GALLERY_IMAGES = [
	heroImage,
	"https://scontent.fmnl9-6.fna.fbcdn.net/v/t39.30808-6/494369075_122128145408749963_4990497671908646009_n.jpg?stp=cp6_dst-jpegr_tt6&_nc_cat=110&ccb=1-7&_nc_sid=7b2446&_nc_ohc=_bIjtQyapPkQ7kNvwGyjTEL&_nc_oc=Adqs_72QnpeiESmu27Z5jwKEdvlzqAcLaFBXBG4oCyJCT9SIGVUdoqhTiyTTjh4lpro&_nc_zt=23&se=-1&_nc_ht=scontent.fmnl9-6.fna&_nc_gid=AsNb17ujiPpWRbYFkqG07w&_nc_ss=7a3a8&oh=00_Af136LY8WbVVP2OmYbCjcpfh2N0e4mOXOcsRxVzAEKKHmg&oe=69D7F2D5",
	"https://scontent.fmnl9-5.fna.fbcdn.net/v/t39.30808-6/494762994_122127788384749963_4263195623448948223_n.jpg?stp=cp6_dst-jpegr_tt6&_nc_cat=109&ccb=1-7&_nc_sid=7b2446&_nc_ohc=6OFQMtbjetIQ7kNvwHtH7vf&_nc_oc=Adr7NEt_2pBX122W0L--hXKylnF9pPJ7v5gY3zAW_Dd9OGkEujcWud89DsChdBnxslw&_nc_zt=23&se=-1&_nc_ht=scontent.fmnl9-5.fna&_nc_gid=dgRO_3Ik7Zj1gdWjg2XxBA&_nc_ss=7a3a8&oh=00_Af3TDz95LXs0-AvgiUGW23HdIYWvYZIGofDco7LGcSNukw&oe=69D7E208",
	"https://scontent.fmnl9-5.fna.fbcdn.net/v/t39.30808-6/481303337_122113740890749963_5078274125687890241_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=7b2446&_nc_ohc=RyHA9Ozrar8Q7kNvwH8K6VK&_nc_oc=AdraLsPc2PDU-Q6_Y9MimOqcUsFDkPs4oXzKKb1LKgve13xWnTLn_dxJbRgX01Q8hlI&_nc_zt=23&_nc_ht=scontent.fmnl9-5.fna&_nc_gid=Dhnwso3p1VJu6NytddB2dQ&_nc_ss=7a3a8&oh=00_Af0ttsvg1OSlH2qn2qu317k9aQJ_eShFNMvwQ-iML3m8zQ&oe=69D7E6DE",
];
const BOT_DISPLAY_NAME = "Hacienda Amara Assistant";
const CLIENT_CHAT_PROMPTS = [
	"What is Hacienda Amara?",
	"Available po ba kayo on [date]?",
	"What are the rates?",
	"What inclusions are available?",
	"Exact location please",
	"Ano po Facebook page?",
	"Can we see photos/videos?",
];
const CLIENT_CHAT_HIGHLIGHTS = [
	"Instant replies",
	"Private venue",
	"Rizal location",
];

const getAvatarInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getProfileDisplayName = (profile) => {
	if (!profile) return "";

	return [profile.firstname, profile.lastname].filter(Boolean).join(" ").trim();
};

const getConversationProfileId = (messages = []) => {
	const threadMessages = Array.isArray(messages) ? messages : [];

	const clientMessage = [...threadMessages]
		.reverse()
		.find((message) => message?.senderRole === "client" && message.senderId && message.senderId !== "guest");

	if (clientMessage?.senderId) return clientMessage.senderId;

	const fallback = [...threadMessages]
		.reverse()
		.find((message) => message?.senderId && message.senderId !== "bot" && message.senderId !== "guest");

	return fallback?.senderId || "";
};

const getDisplayName = (profile) => {
	if (!profile) return "Guest";

	const fullName = [profile.firstname, profile.lastname].filter(Boolean).join(" ").trim();
	if (fullName) return fullName;

	return profile.email || "Guest";
};

const getUserLabel = (profile) => {
	const name = getDisplayName(profile);
	const initials = getInitials(name);

	return { name, initials };
};

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getConversationKey = (profile) => profile?.id || "guest";

const getBotReply = (text) => {
	const lowerText = text.toLowerCase().trim();
	const includesAny = (phrases) => phrases.some((phrase) => lowerText.includes(phrase));

	if (!lowerText) {
		return "Hey! I'm here to help with Hacienda Amara, events, profiles, settings, QR scanning, and inquiries from clients anywhere in the Philippines.";
	}

	if (includesAny(["hi", "hello", "hey", "good morning", "good afternoon", "good evening"])) {
		return "Hi! How can I help you with Hacienda Amara today, whether you're nearby or booking from anywhere in the country?";
	}

	if (includesAny(["what is hacienda amara", "about us", "about hacienda amara", "hacienda amara", "ano ang hacienda amara", "tungkol sa hacienda amara", "amenities", "facilities", "features", "details", "capacity", "guests allowed", "about page details"])) {
		return "Hacienda Amara Private Resort and Events Place, located in Amityville, Brgy. San Jose, Rodriguez, Rizal, is a private, events-focused venue featuring an infinity pool, heated jacuzzi, and air-conditioned living spaces. It accommodates up to 70 guests (20-22 overnight) with full amenities for private parties, staycations, and group retreats. You can view more here: [About Us](/about)";
	}

	if (includesAny(["rules", "house rules", "mga rules", "policy", "policies", "guidelines", "bawal", "limitasyon", "pamantayan"])) {
		return "Para sa safety at cleanliness ng lahat, mayroon kaming mga Rules gaya ng: bawal ang food/drinks sa pool, may designated smoking area, at bawal ang glass bottles malapit sa tubig. Maaari niyo pong basahin ang kumpletong guidelines dito: [Rules](/rules)";
	}

	if (includesAny(["where is", "located", "location", "address", "venue", "exact location", "saan", "loc", "map", "mapa", "directions", "pumunta", "punta", "waze", "google maps", "how to get there"])) {
		return {
			content: `Here is our exact location: ${HACIENDA_AMARA_ADDRESS}\n\n[Open Google Maps](${HACIENDA_AMARA_MAPS_URL})`,
			attachments: [
				{
					id: "location-qr",
					kind: "image",
					name: "Hacienda Amara location QR",
					mimeType: "image/png",
					url: HACIENDA_AMARA_LOCATION_QR_IMAGE,
				},
			],
		};
	}

	if (includesAny(["facebook page", "fb page", "facebook link", "fb link", "facebook", "fb", "meta page"])) {
		return {
			content: `Here is our official Facebook page:\n\n[Open Facebook Page](${HACIENDA_AMARA_FACEBOOK_URL})`,
			attachments: [
				{
					id: "facebook-qr",
					kind: "image",
					name: "Hacienda Amara Facebook QR",
					mimeType: "image/png",
					url: HACIENDA_AMARA_FACEBOOK_QR_IMAGE,
				},
			],
		};
	}

	if (includesAny(["what time can we start setting up", "start setting up", "setup time", "set up"])) {
		return "Setup time depends on the agreed schedule and package, but we usually allow access before the event start time.";
	}

	if (includesAny(["required down payment", "down payment", "downpayment", "dp"])) {
		return "Yes, a down payment is required to secure your reservation.";
	}

	if (includesAny(["full payment", "remaining balance", "settled before", "settled on the event date"])) {
		return "The remaining balance should be settled before or on the event date, based on the agreed terms.";
	}

	if (includesAny(["event coordinators", "coordinator", "coordination"])) {
		return "We can assist with coordination or recommend coordinators if needed.";
	}

	if (includesAny(["wi-fi", "wifi", "internet"])) {
		return "Availability of Wi-Fi depends on the package or request.";
	}

	if (includesAny(["pets allowed", "pet friendly", "pet-friendly", "pets"])) {
		return "Pets may be allowed depending on the event rules and prior approval.";
	}

	if (includesAny(["parking space", "parking", "park"])) {
		return "Parking availability is provided depending on the number of guests and event size.";
	}

	if (includesAny(["bring our own food", "bring our own drinks", "food and drinks", "bring food", "bring drinks"])) {
		return "Yes, bringing your own food and drinks is allowed, subject to certain guidelines.";
	}

	if (includesAny(["extra charges for additional hours", "additional hours", "overtime", "extend hours"])) {
		return "Yes, overtime usage may incur additional charges.";
	}

	if (includesAny(["sound system", "lights", "lightings", "lighting"])) {
		return "Basic sound system and lighting may be included or available as add-ons.";
	}

	if (includesAny(["electricity included", "electricity", "power"])) {
		return "Yes, electricity is included for standard use within the event.";
	}

	if (includesAny(["restrictions on decorations", "decorations", "decorate"])) {
		return "Decorations are allowed, but we may have guidelines to protect the venue and ensure safety.";
	}

	if (includesAny(["rehearsals before the event", "rehearsal", "rehearse"])) {
		return "Rehearsals may be arranged depending on availability and schedule.";
	}

	if (includesAny(["corkage fee", "corkage"])) {
		return "Corkage fees may apply for certain outside items, depending on the agreement.";
	}

	if (includesAny(["guest list", "guests list"])) {
		return "Yes, a guest list is helpful for planning and managing the event properly.";
	}

	if (includesAny(["extend the event duration", "extend event duration", "extension", "extend"])) {
		return "Extensions are possible depending on availability and may have additional fees.";
	}

	if (includesAny(["cleaning services", "cleanup", "cleaning after the event"])) {
		return "Basic cleaning is included, but additional cleanup may be required for excessive mess.";
	}

	if (includesAny(["security deposit", "deposit"])) {
		return "A security deposit may be required and is refundable based on venue condition after the event.";
	}

	if (includesAny(["visit or inspect the venue", "site visits", "site visit", "inspect the venue", "venue before booking"])) {
		return "Yes, site visits can be arranged by appointment.";
	}

	if (includesAny(["how early should we book", "book early", "book as early as possible"])) {
		return "It is recommended to book as early as possible, especially for peak dates, to secure your preferred schedule.";
	}

	if (includesAny(["where to pay", "how to pay", "saan ako magbabayad", "saan magbabayad", "saan ako mag babayad", "payment qr", "mode of payment", "payment details", "payment info", "payment instruction", "bayad", "pay"])) {
		return {
			content: "Scan here to\ncomplete payment\n\nGCASH\nMara Jane Garcia\n0968-326-0522\n\nBDO Unibank, Inc.\nMara Jane Garcia\n0101-6000-5035",
			attachments: [
				{
					id: "payment-qr",
					kind: "image",
					name: "Payment QR",
					mimeType: "image/jpeg",
					url: HACIENDA_AMARA_PAYMENT_QR,
				},
			],
		};
	}

	if (includesAny(["availability", "available po", "slot", "booking", "reserve", "reserve po", "reservation", "book"])) {
		return "Available po ba sa chosen date? I can help check that. For booking, please send your date, time, and guest count. Note: Prices are for 20 pax, additional pax at ₱200/head. Kids 8 and below are FREE.";
	}

	if (includesAny(["overnight", "day tour", "how many guests", "guest limit", "capacity", "allowed"])) {
		return "We offer Day Time (9AM-6PM), Night Time (9PM-6AM), and 21-hour Overnight stays. Rates are for 20 pax. Additional pax: ₱200/head. Kids 8 and below are FREE.";
	}

	if (includesAny(["rate", "rates", "package", "packages", "promo", "discount", "down payment", "payment", "deposit", "mode of payment", "gcash", "cash", "bank transfer"])) {
		return "2026 Rates for 20 pax: Day Time (₱6,999-₱7,999), Night Time (₱7,999-₱8,999), Overnight (₱14,999-₱17,999). Extra guests: ₱200/head. Kids 8 & below are FREE!";
	}

	if (includesAny(["inclusion", "inclusions", "amenities", "facilities", "pool", "room", "room po", "air-conditioned", "ac room", "wifi", "videoke", "sound system", "kitchen", "utensil", "generator", "tv", "netflix", "ref", "freezer"])) {
		return "Our team can share the current inclusions and amenities like pool, rooms, WiFi, videoke, and more. Please message your preferred date so we can send the exact details.";
	}

	if (includesAny(["event setup", "birthday", "wedding", "debut", "tables", "chairs", "decorations", "stylist", "lights and sound", "stage", "coordinator", "fireworks", "overnight after event"])) {
		return "Yes, we can assist with birthdays, weddings, debuts, and event setup inquiries. Please send your event date and desired setup so we can confirm what is included.";
	}

	if (includesAny(["check-in", "check out", "check out time", "food", "bring food", "corkage", "pet-friendly", "cancellation", "reschedule", "security deposit", "noise", "curfew", "damage", "clean"])) {
		return "Para sa mga policies gaya ng check-in/out, pets, at iba pang rules, maaari niyo pong basahin ang detalye rito: [Rules](/rules)";
	}

	if (includesAny(["can i", "can we see photos/videos", "pictures", "videos", "photo", "video", "gallery", "reviews", "site visit", "ocular", "parking", "commute", "accessible", "safe"])) {
		return "Yes po, we can share photos and video clips upon request. Please message us directly and we will send the latest available media.";
	}

	if (includesAny(["event", "events"])) {
		return "You can browse events from the Events page. If you need admin help, manage them from Manage Events.";
	}

	if (includesAny(["profile"])) {
		return "Go to Profile to view your account details or Edit Profile to update them.";
	}

	if (includesAny(["setting"])) {
		return "Open Settings to update preferences, password, and other account options.";
	}

	if (includesAny(["qr", "scan"])) {
		return "Open the Scan QR page, allow camera access, and point it at the code.";
	}

	return "Thanks for your message. If you need more help, ask about availability, rates, amenities, location, events, rules, policies, photos, or nationwide bookings.";
};

const getMessageId = () => {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}

	return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const encodeMessageContent = (content, attachments = []) => {
	if (!Array.isArray(attachments) || attachments.length === 0) {
		return content || "";
	}

	return `${MEDIA_CONTENT_PREFIX}${JSON.stringify({
		content: content || "",
		attachments,
	})}`;
};

const decodeMessageContent = (rawContent) => {
	if (typeof rawContent !== "string") {
		return { content: "", attachments: [] };
	}

	if (!rawContent.startsWith(MEDIA_CONTENT_PREFIX)) {
		return { content: rawContent, attachments: [] };
	}

	try {
		const parsed = JSON.parse(rawContent.slice(MEDIA_CONTENT_PREFIX.length));
		return {
			content: typeof parsed.content === "string" ? parsed.content : "",
			attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
		};
	} catch {
		return {
			content: rawContent.replace(MEDIA_CONTENT_PREFIX, ""),
			attachments: [],
		};
	}
};

const readFileAsObjectUrl = (file) => URL.createObjectURL(file);

const revokePreviewUrl = (attachment) => {
	if (!attachment?.previewUrl || typeof attachment.previewUrl !== "string") return;
	if (!attachment.previewUrl.startsWith("blob:")) return;

	URL.revokeObjectURL(attachment.previewUrl);
};

const getAttachmentSource = (attachment) =>
	attachment?.url || attachment?.publicUrl || attachment?.dataUrl || attachment?.previewUrl || "";

const mediaInlineClassName =
	"block max-h-80 w-full rounded-xl bg-slate-950 object-contain";

const mediaViewerClassName = "max-h-[80vh] w-full bg-slate-950 object-contain";

const getSafeFileExtension = (name = "", mimeType = "") => {
	const nameParts = String(name).split(".");
	if (nameParts.length > 1) {
		return nameParts.pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "";
	}

	if (mimeType.includes("/")) {
		const [, subtype] = mimeType.split("/");
		return subtype.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
	}

	return "";
};

const buildStoragePath = (messageId, attachment) => {
	const extension = getSafeFileExtension(attachment.name, attachment.mimeType);
	const fileName = String(attachment.name || attachment.kind || "media")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || attachment.kind || "media";
	const suffix = extension ? `.${extension}` : "";

	return `messages/${messageId}/${attachment.id || getMessageId()}-${fileName}${suffix}`;
};

const formatTime = (value) => {
	if (!value) return "";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";

	return date.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
};

const getMessageText = (message) => message?.content || "";

const renderTextWithLinks = (text) => {
	const source = String(text || "");
	const parts = [];
	const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
	let lastIndex = 0;
	let match;

	while ((match = linkPattern.exec(source))) {
		if (match.index > lastIndex) {
			parts.push({ type: "text", value: source.slice(lastIndex, match.index) });
		}

		if (match[1] && match[2]) {
			parts.push({ type: "link", label: match[1], href: match[2] });
		} else if (match[3]) {
			parts.push({ type: "link", label: match[3], href: match[3] });
		}

		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < source.length) {
		parts.push({ type: "text", value: source.slice(lastIndex) });
	}

	return parts.map((part, index) => {
		if (part.type === "link") {
			const isInternal = part.href.startsWith("/");
			if (isInternal) {
				return (
					<NavLink
						key={`${part.href}-${index}`}
						to={part.href}
						className="underline underline-offset-4 font-bold text-[#8b5e34] hover:text-[#a06f45]"
					>
						{part.label}
					</NavLink>
				);
			}
			return (
				<a
					key={`${part.href}-${index}`}
					href={part.href}
					target="_blank"
					rel="noreferrer"
					className="underline underline-offset-4"
					aria-label={`Open link: ${part.label}`}
				>
					{part.label}
				</a>
			);
		}

		return <span key={`${part.value}-${index}`}>{part.value}</span>;
	});
};

const getAttachmentSummary = (attachments = []) => {
	if (!Array.isArray(attachments) || attachments.length === 0) return "";

	const counts = attachments.reduce(
		(acc, attachment) => {
			if (attachment?.kind === "video") {
				acc.video += 1;
			} else if (attachment?.kind === "image") {
				acc.image += 1;
			}

			return acc;
		},
		{ image: 0, video: 0 },
	);

	const parts = [];
	if (counts.image > 0) parts.push(`${counts.image} photo${counts.image === 1 ? "" : "s"}`);
	if (counts.video > 0) parts.push(`${counts.video} video${counts.video === 1 ? "" : "s"}`);

	return parts.join(", ");
};

const readHistory = () => {
	if (typeof window === "undefined") return {};

	try {
		const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
};

const writeHistory = (history) => {
	if (typeof window === "undefined") return;

	localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
};

const upsertConversationHistory = (history, message) => {
	const existing = history[message.conversationKey] || [];
	const alreadyIncluded = existing.some((item) => item.id === message.id);
	if (alreadyIncluded) return history;

	return {
		...history,
		[message.conversationKey]: [...existing, message].sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
		),
	};
};

const removeMessageFromHistory = (history, messageId, conversationKey) => {
	const existing = history[conversationKey] || [];
	const nextMessages = existing.filter((message) => message.id !== messageId);

	if (nextMessages.length === existing.length) {
		return history;
	}

	const nextHistory = { ...history };
	if (nextMessages.length === 0) {
		delete nextHistory[conversationKey];
	} else {
		nextHistory[conversationKey] = nextMessages;
	}

	return nextHistory;
};

const normalizeDbMessage = (row) => ({
	id: row.id,
	conversationKey: row.conversation_key,
	senderId: row.sender_id,
	senderRole: row.sender_role,
	senderName: row.sender_name,
	...decodeMessageContent(row.content),
	createdAt: row.created_at,
});

const toDbPayload = (message) => ({
	id: message.id,
	conversation_key: message.conversationKey,
	sender_id: message.senderId,
	sender_role: message.senderRole,
	sender_name: message.senderName,
	content: encodeMessageContent(message.content, message.attachments),
	created_at: message.createdAt,
});

const Chat = () => {
	const { profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const isAdmin = profile?.role === "admin";
	const conversationKey = getConversationKey(profile);
	const displayName = getDisplayName(profile);
	const display = getUserLabel(profile);

	const [adminAvailable, setAdminAvailable] = useState(() => {
		if (typeof window === "undefined" || !isAdmin) return false;

		const saved = localStorage.getItem(ADMIN_AVAILABILITY_KEY);
		return saved ? saved === "true" : true;
	});
	const [presenceOnline, setPresenceOnline] = useState(false);
	const [historyByConversation, setHistoryByConversation] = useState(() => {
		const stored = readHistory();
		return stored;
	});
	const [activeConversationKey, setActiveConversationKey] = useState(conversationKey);
	const [prompt, setPrompt] = useState("");
	const [draftAttachments, setDraftAttachments] = useState([]);
	const [selectedMedia, setSelectedMedia] = useState(null);
	const [isSending, setIsSending] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState("");
	const [profilesById, setProfilesById] = useState({});
	const messageListRef = useRef(null);
	const shouldStickToBottomRef = useRef(true);
	const pendingScrollToBottomRef = useRef(true);
	const channelRef = useRef(null);
	const photoInputRef = useRef(null);
	const videoInputRef = useRef(null);
	const dbAvailableRef = useRef(true);

	const activeMessages = historyByConversation[activeConversationKey] || [];
	const activeThreadName =
		activeMessages.slice().reverse().find((message) => message.senderName)?.senderName ||
		(isAdmin ? "Client" : displayName);
	const activeMessagesProfiles = useMemo(() => {
		const ids = new Set();
		for (const message of activeMessages) {
			if (message?.senderId && message.senderId !== "bot" && message.senderId !== "guest") {
				ids.add(message.senderId);
			}
		}

		return [...ids];
	}, [activeMessages]);
	const sidebarProfiles = useMemo(() => {
		if (!isAdmin) return [];

		const ids = new Set();
		Object.values(historyByConversation).forEach((messages) => {
			const profileId = getConversationProfileId(messages);
			if (profileId) ids.add(profileId);
		});

		return [...ids];
	}, [historyByConversation, isAdmin]);

	const conversations = useMemo(() => {
		if (!isAdmin) {
			return [
				{
					key: conversationKey,
					lastMessage: activeMessages[activeMessages.length - 1] || null,
				},
			];
		}

		return Object.entries(historyByConversation)
			.map(([key, messages]) => ({
				key,
				lastMessage: messages[messages.length - 1] || null,
			}))
			.sort((a, b) => {
				const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
				const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
				return bTime - aTime;
			});
	}, [activeMessages, conversationKey, historyByConversation, isAdmin]);

	const adminOnline = presenceOnline;
	const canReply = !isAdmin || adminAvailable;

	const scrollMessagesToBottom = (behavior = "smooth") => {
		const container = messageListRef.current;
		if (!container) return;

		container.scrollTo({
			top: container.scrollHeight,
			behavior,
		});
	};

	const isNearBottom = () => {
		const container = messageListRef.current;
		if (!container) return true;

		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;

		return distanceFromBottom < 120;
	};

	useEffect(() => {
		writeHistory(historyByConversation);
	}, [historyByConversation]);

	const mergeMessage = (message) => {
		setHistoryByConversation((current) => {
			return upsertConversationHistory(current, message);
		});
	};

	const persistMessage = async (message) => {
		if (!dbAvailableRef.current) return;

		try {
			const { error: dbError } = await supabase.from("chat_messages").insert(toDbPayload(message));
			if (dbError) {
				const text = `${dbError.message || ""} ${dbError.details || ""}`.toLowerCase();
				if (text.includes("does not exist") || text.includes("relation")) {
					dbAvailableRef.current = false;
				}
			}
		} catch (dbError) {
			const text = `${dbError?.message || ""}`.toLowerCase();
			if (text.includes("does not exist") || text.includes("relation")) {
				dbAvailableRef.current = false;
			}
		}
	};

	const refreshFromDb = async () => {
		if (!dbAvailableRef.current) return false;

		try {
			let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
			if (!isAdmin) {
				query = query.eq("conversation_key", conversationKey);
			}

			const { data, error: dbError } = await query;
			if (dbError) {
				const text = `${dbError.message || ""} ${dbError.details || ""}`.toLowerCase();
				if (text.includes("does not exist") || text.includes("relation")) {
					dbAvailableRef.current = false;
				}

				return false;
			}

			const grouped = {};
			(data || []).forEach((row) => {
				const message = normalizeDbMessage(row);
				grouped[message.conversationKey] = grouped[message.conversationKey] || [];
				const hasMessage = grouped[message.conversationKey].some((item) => item.id === message.id);
				if (!hasMessage) {
					grouped[message.conversationKey].push(message);
				}
			});

			const nextSnapshot = isAdmin
				? grouped
				: {
						[conversationKey]: grouped[conversationKey] || [],
				  };

			setHistoryByConversation(nextSnapshot);

			return nextSnapshot;
		} catch {
			return false;
		}
	};

	useEffect(() => {
		const profileIds = new Set([...activeMessagesProfiles, ...sidebarProfiles]);
		if (profile?.id) {
			profileIds.add(profile.id);
		}

		if (profileIds.size === 0) return undefined;

		let cancelled = false;
		const loadProfiles = async () => {
			const ids = [...profileIds];
			const { data, error: dbError } = await supabase
				.from("profiles")
				.select("id, firstname, lastname, avatar_url, email, role")
				.in("id", ids);

			if (cancelled || dbError || !Array.isArray(data)) return;

			setProfilesById((current) => {
				const next = { ...current };
				for (const row of data) {
					next[row.id] = row;
				}
				return next;
			});
		};

		loadProfiles();

		return () => {
			cancelled = true;
		};
	}, [activeMessagesProfiles, profile?.avatar_url, profile?.id, sidebarProfiles]);

	const refreshMessages = async () => {
		setIsRefreshing(true);
		try {
			await refreshFromDb();
		} finally {
			setIsRefreshing(false);
		}
	};

	const clearCurrentChat = async () => {
		if (typeof window !== "undefined") {
			const confirmed = window.confirm("Clear this chat conversation?");
			if (!confirmed) return;
		}

		const targetConversationKey = isAdmin ? activeConversationKey : conversationKey;

		setHistoryByConversation((current) => {
			const next = { ...current };
			delete next[targetConversationKey];
			return next;
		});

		setPrompt("");
		clearDraftAttachment();

		if (dbAvailableRef.current) {
			try {
				await supabase.from("chat_messages").delete().eq("conversation_key", targetConversationKey);
			} catch {
				// If delete fails, the local view still clears immediately.
			}
		}
	};

	useEffect(() => {
		setLoading(true);
		setError("");
		pendingScrollToBottomRef.current = true;

		const initialize = async () => {
			if (profile) {
				const loaded = await refreshFromDb();
				if (!loaded) {
					const stored = readHistory();
					setHistoryByConversation(stored);
				}
			} else {
				setHistoryByConversation(readHistory());
			}

			if (!isAdmin) {
				setActiveConversationKey(conversationKey);
			} else {
				const keys = Object.keys(readHistory());
				setActiveConversationKey(keys[0] || conversationKey);
			}

			setLoading(false);
		};

		initialize();
	}, [conversationKey, isAdmin, profile]);

	useEffect(() => {
		pendingScrollToBottomRef.current = true;
		shouldStickToBottomRef.current = true;
	}, [activeConversationKey]);

	useEffect(() => {
		if (!isAdmin) return;

		const keys = Object.keys(historyByConversation);
		if (keys.length === 0) return;
		if (historyByConversation[activeConversationKey]) return;

		setActiveConversationKey(keys[0]);
	}, [activeConversationKey, historyByConversation, isAdmin]);

	useEffect(() => {
		if (!profile) return undefined;

		const interval = window.setInterval(() => {
			refreshFromDb();
		}, 4000);

		return () => {
			window.clearInterval(interval);
		};
	}, [conversationKey, isAdmin, profile]);

	useEffect(() => {
		if (!profile || typeof window === "undefined") return undefined;

		const handleFocus = () => {
			if (document.visibilityState === "visible") {
				void refreshFromDb();
			}
		};

		window.addEventListener("focus", handleFocus);
		document.addEventListener("visibilitychange", handleFocus);

		return () => {
			window.removeEventListener("focus", handleFocus);
			document.removeEventListener("visibilitychange", handleFocus);
		};
	}, [profile]);

	useEffect(() => {
		if (!profile) return undefined;

		const channel = supabase.channel(BROADCAST_CHANNEL);
		channelRef.current = channel;

		const applyPresence = () => {
			const state = channel.presenceState();
			const admins = Object.values(state).flat().filter((entry) => entry.role === "admin" && entry.available);
			setPresenceOnline(admins.length > 0);
		};

		channel.on("broadcast", { event: "message" }, ({ payload }) => {
			if (!payload?.id || !payload?.conversationKey) return;

			setHistoryByConversation((current) => {
				const existing = current[payload.conversationKey] || [];
				if (existing.some((item) => item.id === payload.id)) {
					return current;
				}

				return upsertConversationHistory(current, payload);
			});

			if (!isAdmin && payload.conversationKey === conversationKey) {
				setActiveConversationKey(conversationKey);
			}
		});

		channel.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "chat_messages",
			},
			({ new: row }) => {
				if (!row?.id || !row?.conversation_key) return;

				const message = normalizeDbMessage(row);
				setHistoryByConversation((current) => {
					const existing = current[message.conversationKey] || [];
					if (existing.some((item) => item.id === message.id)) {
						return current;
					}

					return upsertConversationHistory(current, message);
				});

				if (!isAdmin && message.conversationKey === conversationKey) {
					setActiveConversationKey(conversationKey);
				}
			},
		);

		channel.on(
			"postgres_changes",
			{
				event: "DELETE",
				schema: "public",
				table: "chat_messages",
			},
			({ old: previousRow }) => {
				const messageId = previousRow?.id;
				const targetConversationKey = previousRow?.conversation_key;
				if (!messageId || !targetConversationKey) return;

				setHistoryByConversation((current) => {
					return removeMessageFromHistory(current, messageId, targetConversationKey);
				});

				if (!isAdmin && targetConversationKey === conversationKey) {
					setActiveConversationKey(conversationKey);
				}
			},
		);

		// Listener para sa profile changes (Para mag-update ang avatar/name sa lahat ng gadgets)
		channel.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "profiles",
			},
			({ new: updatedProfile }) => {
				console.log("👤 Remote profile updated:", updatedProfile.id);
				setProfilesById((current) => {
					if (!current[updatedProfile.id]) return current;
					return {
						...current,
						[updatedProfile.id]: {
							...current[updatedProfile.id],
							firstname: updatedProfile.firstname,
							lastname: updatedProfile.lastname,
							avatar_url: updatedProfile.avatar_url,
						}
					};
				});
			}
		);

		channel.on("presence", { event: "sync" }, applyPresence);
		channel.on("presence", { event: "join" }, applyPresence);
		channel.on("presence", { event: "leave" }, applyPresence);

		channel.subscribe(async (status) => {
			if (status !== "SUBSCRIBED") return;

			if (isAdmin) {
				if (adminAvailable) {
					await channel.track({
						role: "admin",
						available: true,
						name: displayName,
						profileId: profile.id,
					});
				}
			} else {
				await channel.track({
					role: "client",
					available: true,
					name: displayName,
					profileId: profile.id,
					conversationKey,
				});
			}
		});

		return () => {
			channel.unsubscribe();
			channelRef.current = null;
		};
	}, [adminAvailable, conversationKey, displayName, isAdmin, profile]);

	useEffect(() => {
		if (!isAdmin) return;

		if (typeof window !== "undefined") {
			localStorage.setItem(ADMIN_AVAILABILITY_KEY, String(adminAvailable));
		}

		const channel = channelRef.current;
		if (!channel) return;

		(async () => {
			try {
				if (adminAvailable) {
					await channel.track({
						role: "admin",
						available: true,
						name: displayName,
						profileId: profile.id,
					});
				} else {
					await channel.untrack();
				}
				setPresenceOnline(adminAvailable);
			} catch {
				// The chat still works even if presence tracking is temporarily unavailable.
			}
		})();
	}, [adminAvailable, displayName, isAdmin, profile]);

	useEffect(() => {
		if (loading) return;

		const shouldScroll =
			pendingScrollToBottomRef.current || shouldStickToBottomRef.current;

		if (!shouldScroll) return;

		scrollMessagesToBottom(pendingScrollToBottomRef.current ? "auto" : "smooth");
		pendingScrollToBottomRef.current = false;
	}, [activeMessages.length, activeConversationKey, loading]);

	const sendMessage = async (
		content,
		senderRole = isAdmin ? "admin" : "client",
		attachments = draftAttachments,
	) => {
		const messageId = getMessageId();
		const uploadDraftAttachment = async (attachment) => {
			if (!attachment?.file) {
				return {
					id: attachment?.id || getMessageId(),
					kind: attachment?.kind || "image",
					name: attachment?.name || "Attached media",
					mimeType: attachment?.mimeType || "application/octet-stream",
					url: getAttachmentSource(attachment),
				};
			}

			const storagePath = buildStoragePath(messageId, attachment);
			const { error: uploadError } = await supabase.storage
				.from(CHAT_MEDIA_BUCKET)
				.upload(storagePath, attachment.file, {
					contentType: attachment.mimeType || attachment.file.type || undefined,
					upsert: false,
				});

			if (uploadError) {
				throw new Error(uploadError.message || "Unable to upload chat media.");
			}

			const { data } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(storagePath);
			return {
				id: attachment.id || getMessageId(),
				kind: attachment.kind,
				name: attachment.name,
				mimeType: attachment.mimeType,
				url: data.publicUrl,
				path: storagePath,
				bucket: CHAT_MEDIA_BUCKET,
			};
		};

		const uploadedAttachments = Array.isArray(attachments)
			? await Promise.all(attachments.map((attachment) => uploadDraftAttachment(attachment)))
			: [];

		const message = {
			id: messageId,
			conversationKey: isAdmin ? activeConversationKey : conversationKey,
			senderId: profile?.id || "guest",
			senderRole,
			senderName: displayName,
			content,
			attachments: uploadedAttachments,
			createdAt: new Date().toISOString(),
		};

		mergeMessage(message);
		await persistMessage(message);

		const channel = channelRef.current;
		if (channel) {
			await channel.send({
				type: "broadcast",
				event: "message",
				payload: message,
			});
		}

		return message;
	};

	const handleAttachmentSelection = async (event, kind) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;
		if (kind === "image" && !file.type.startsWith("image/")) return;
		if (kind === "video" && !file.type.startsWith("video/")) return;

		try {
			const attachment = {
				id: getMessageId(),
				kind,
				name: file.name,
				mimeType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
				file,
				previewUrl: readFileAsObjectUrl(file),
			};
			setDraftAttachments((current) => {
				const replaced = current.find((item) => item.kind === kind);
				revokePreviewUrl(replaced);
				const next = [...current.filter((item) => item.kind !== kind), attachment];
				return next;
			});
			setError("");
		} catch {
			setError("Unable to attach the selected file.");
		}
	};

	const clearDraftAttachment = () => {
		draftAttachments.forEach(revokePreviewUrl);
		setDraftAttachments([]);
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		const trimmed = DOMPurify.sanitize(prompt.trim());
		if (!trimmed && draftAttachments.length === 0) return;
		if (loading || isSending) return;
		if (isAdmin && !canReply) return;

		setError("");
		setIsSending(true);
		pendingScrollToBottomRef.current = true;
		shouldStickToBottomRef.current = true;

		try {
			const outgoing = await sendMessage(trimmed, isAdmin ? "admin" : "client", draftAttachments);
			if (draftAttachments.length > 0) {
				clearDraftAttachment();
			}
			setPrompt("");

			// Trigger bot if admin is offline OR if it's a location-related query 
			// (allowing admin to also trigger the QR code for the client)
			const isLocationQuery = ["where is", "location", "address", "saan", "loc", "map", "mapa", "directions", "google maps", "waze", "how to get there", "pumunta", "punta", "exact location"].some(k => trimmed.toLowerCase().includes(k));
			const isAboutQuery = ["about", "about us", "amenities", "details", "facilities", "features", "ano ang", "tungkol", "about page details"].some(k => trimmed.toLowerCase().includes(k));
			const isRulesQuery = ["rules", "policy", "policies", "guidelines", "house rules", "mga rules", "bawal"].some(k => trimmed.toLowerCase().includes(k));
			const isPaymentQuery = ["pay", "bayad", "payment", "magbabayad", "saan magbabayad", "saan ako mag babayad", "mode of payment", "payment details"].some(k => trimmed.toLowerCase().includes(k));
			if ((!isAdmin && !adminOnline) || isLocationQuery || isAboutQuery || isRulesQuery || isPaymentQuery || trimmed.toLowerCase().includes("qr")) {
				const hasVideo = draftAttachments.some((item) => item.kind === "video");
				const hasPhoto = draftAttachments.some((item) => item.kind === "image");
				const botReply = draftAttachments.length
					? {
							content: hasVideo && hasPhoto
								? "Thanks for sending the photo and video. We will check them and reply as soon as possible."
								: hasVideo
									? "Thanks for sending the video. We will check it and reply as soon as possible."
									: "Thanks for sending the photo. We will check it and reply as soon as possible.",
							attachments: [],
						}
					: getBotReply(trimmed);
				const replyText =
					typeof botReply === "string" ? botReply : botReply.content || "";
				const replyAttachments =
					typeof botReply === "string" ? [] : botReply.attachments || [];
				const botMessage = {
					id: getMessageId(),
					conversationKey: outgoing.conversationKey,
					senderId: "bot",
					senderRole: "bot",
					senderName: BOT_DISPLAY_NAME,
					content: replyText,
					attachments: replyAttachments,
					createdAt: new Date().toISOString(),
				};

				window.setTimeout(async () => {
					pendingScrollToBottomRef.current = true;
					mergeMessage(botMessage);
					await persistMessage(botMessage);
					const channel = channelRef.current;
					if (channel) {
						await channel.send({
							type: "broadcast",
							event: "message",
							payload: botMessage,
						});
					}
				}, 650);
			}
		} catch {
			setError("Unable to send media right now. Please try again.");
		} finally {
			setIsSending(false);
		}
	};

	const handleKeyDown = (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			handleSubmit(event);
		}
	};

	const renderMessage = (message) => {
		const isOutgoing = isAdmin
			? message.senderRole === "admin"
			: message.senderRole === "client";
		const isRightAligned = isOutgoing;
		const isBotMessage = message.senderRole === "bot";
		const time = formatTime(message.createdAt);
		const attachments = Array.isArray(message.attachments) ? message.attachments : [];
		const attachmentSummary = getAttachmentSummary(attachments);
		const senderProfile = message.senderId ? profilesById[message.senderId] : null;
		const senderDisplayName =
			getProfileDisplayName(senderProfile) || message.senderName || (isBotMessage ? BOT_DISPLAY_NAME : "Guest");
		const avatarLabel = getAvatarInitials(senderDisplayName);
		const avatarUrl = senderProfile?.avatar_url || (isRightAligned ? profile?.avatar_url : null);
		const bubbleToneClassName = isRightAligned
			? "rounded-br-lg border border-[#8b5e34]/15 bg-[#9a6a39] text-[#fff7eb] shadow-[0_6px_18px_rgba(154,106,57,0.16)]"
			: isBotMessage
				? "rounded-bl-lg border border-[#ead9c2] bg-[#fff8ef] text-[#3b2a1a] shadow-[0_6px_18px_rgba(138,94,52,0.08)]"
				: "rounded-bl-lg border border-[#ead9c2] bg-[#fffdf8] text-[#3b2a1a] shadow-[0_6px_18px_rgba(138,94,52,0.08)]";
		const messageToneClassName = isRightAligned ? "text-[#fff7eb]" : "text-[#3b2a1a]";
		const footerText = attachmentSummary || (isRightAligned ? "Delivered" : "");

		return (
			<div
				key={message.id}
				className={`chat ${isRightAligned ? "chat-end" : "chat-start"} ${isRightAligned ? "justify-end" : "justify-start"}`}
			>
				<div className="chat-image avatar">
					<div className="w-10 overflow-hidden rounded-full border border-[#ead9c2] bg-[#9a6a39] text-xs font-bold text-white shadow-sm">
						{avatarUrl ? (
							<img
								src={avatarUrl}
								alt={senderDisplayName}
								className="h-10 w-10 object-cover"
							/>
						) : (
							<div className="flex h-10 w-10 items-center justify-center">
								{avatarLabel}
							</div>
						)}
					</div>
				</div>

				<div className={`chat-header flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] ${isRightAligned ? "justify-end text-right" : "justify-start text-left"} ${messageToneClassName}`}>
					<span className={`font-semibold ${isRightAligned ? "text-[#9a6a39]" : "text-[#8b5e34]"}`}>
						{senderDisplayName}
					</span>
					{time && (
						<time className="text-xs normal-case tracking-normal opacity-50">
							{time}
						</time>
					)}
				</div>

				<div className={`chat-bubble ${bubbleToneClassName} max-w-[82%] text-sm leading-6 ${messageToneClassName}`}>
					{getMessageText(message).trim() && (
						<p className="whitespace-pre-wrap">{renderTextWithLinks(getMessageText(message))}</p>
					)}
					{!getMessageText(message).trim() && attachmentSummary && (
						<p className={`text-xs font-medium uppercase tracking-[0.2em] ${isRightAligned ? "text-white/75" : "text-slate-500"}`}>
							{attachmentSummary}
						</p>
					)}
					{attachments.length > 0 && (
						<div className="mt-3 space-y-2">
							{attachments.map((attachment) => (
								<div key={attachment.id || getAttachmentSource(attachment)} className="overflow-hidden rounded-2xl border border-white/20 bg-black/5">
									{attachment.kind === "video" ? (
										<video
											controls
											playsInline
											preload="metadata"
											className={mediaInlineClassName}
											src={getAttachmentSource(attachment)}
										>
											<source src={getAttachmentSource(attachment)} type={attachment.mimeType || "video/mp4"} />
										</video>
									) : (
										<button
											type="button"
											onClick={() => setSelectedMedia(attachment)}
											className="block w-full text-left"
											aria-label={`Open image ${attachment.name || "attachment"}`}
										>
											<img
												src={getAttachmentSource(attachment)}
												alt={attachment.name || "Attached media"}
												loading="eager"
												decoding="async"
												className={mediaInlineClassName}
											/>
										</button>
									)}
									<div className={`flex items-center justify-between gap-3 px-3 py-2 text-[0.72rem] ${isRightAligned ? "text-white/80" : "text-slate-500"}`}>
										<span className="truncate">{attachment.name || (attachment.kind === "video" ? "Video" : "Photo")}</span>
										<div className="flex items-center gap-2">
											<span className="shrink-0 uppercase tracking-[0.18em]">
												{attachment.kind}
											</span>
											<button
												type="button"
												onClick={() => setSelectedMedia(attachment)}
												className="shrink-0 rounded-full border border-current/20 px-2 py-1 text-[0.68rem] uppercase tracking-[0.16em] transition hover:bg-current/10"
											>
												View
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className={`chat-footer text-[0.68rem] ${isRightAligned ? "text-[#e2cfb6]" : "text-[#8f7b63]"}`}>
					{footerText}
				</div>
			</div>
		);
	};

	const currentThreadMessages = isAdmin ? activeMessages : historyByConversation[conversationKey] || [];

	return (
		<MainLayout>
			<div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 pt-5 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl px-2 pb-4 sm:px-4 sm:pb-6">
					<div className="relative overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/75 shadow-2xl backdrop-blur-xl sm:rounded-[2rem]">
					<div className="relative flex min-h-[calc(100dvh-8rem)] min-h-0 flex-col overflow-hidden lg:flex-row">
					{isAdmin && (
						<aside className="flex h-64 lg:h-auto min-h-0 flex-col border-b border-[#ead9c2] bg-white lg:w-84 lg:border-b-0 lg:border-r">
							<div className="border-b border-[#ead9c2] bg-white px-4 py-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-xs uppercase tracking-[0.25em] text-[#a06f45]">
											Support Inbox
										</p>
										<h2 className="text-lg font-semibold text-slate-900">Clients</h2>
									</div>
									<button
										type="button"
										onClick={() => setAdminAvailable((current) => !current)}
										className="btn btn-xs rounded-full border border-[#ead9c2] bg-white px-3 text-slate-900 hover:bg-[#fff8ef]"
									>
										{adminAvailable ? "Go offline" : "Go online"}
									</button>
								</div>
								<p className="mt-2 text-xs text-slate-500">
									{adminAvailable
										? "Clients can see you online and reply directly."
										: "Clients will see the bot reply while you are offline."}
								</p>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto p-3">
								{conversations.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-[#ead9c2] bg-[#fffaf3] p-4 text-sm text-slate-500">
										No client chats yet.
									</div>
								) : (
									<div className="space-y-2">
										{conversations.map((conversation) => {
											const latest = conversation.lastMessage;
											const isActive = conversation.key === activeConversationKey;
											const latestAttachments = Array.isArray(latest?.attachments) ? latest.attachments : [];
											const latestPreview = latestAttachments.length > 0
												? `${getAttachmentSummary(latestAttachments)}${latest?.content ? ` • ${latest.content}` : ""}`
											: latest?.content || "No messages yet.";
											const conversationProfileId = getConversationProfileId(
												historyByConversation[conversation.key] || [],
											);
											const conversationProfile = conversationProfileId ? profilesById[conversationProfileId] : null;
											const conversationDisplayName =
												getProfileDisplayName(conversationProfile) ||
												latest?.senderName ||
												"Client";
											const conversationAvatar = conversationProfile?.avatar_url || "";
											return (
												<button
												key={conversation.key}
												type="button"
												onClick={() => setActiveConversationKey(conversation.key)}
													className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
														isActive
															? "border-[#8b5e34] bg-[#fff8ef] shadow-sm"
															: "border-[#ead9c2] bg-white hover:border-[#d7c0a3]"
													}`}
												>
													<div className="flex items-start gap-3">
														<div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ead9c2] bg-[#f4e0c6] text-xs font-bold text-[#8b5e34] shadow-sm">
															{conversationAvatar ? (
																<img
																	src={conversationAvatar}
																	alt={conversationDisplayName}
																	className="h-full w-full object-cover"
																/>
															) : (
																getAvatarInitials(conversationDisplayName)
															)}
														</div>
														<div className="min-w-0 flex-1">
															<p className="truncate text-sm font-semibold text-slate-900">
																{conversationDisplayName}
															</p>
															<p className="mt-1 line-clamp-2 text-xs text-slate-500">
																{latestPreview}
															</p>
														</div>
														{latest?.createdAt && (
															<span className="text-[0.7rem] text-slate-400">
																{formatTime(latest.createdAt)}
															</span>
														)}
													</div>
												</button>
											);
										})}
									</div>
								)}
							</div>
						</aside>
					)}

						<div className="flex min-w-0 min-h-0 flex-1 flex-col">
						<div className="flex flex-col gap-3 border-b border-black/5 bg-white/75 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
							<div className="flex min-w-0 items-center gap-3">
								<button
									type="button"
									onClick={() => navigate(-1)}
									className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4e6] text-lg font-semibold text-slate-900 transition hover:bg-[#f3dfc6]"
									aria-label="Go back"
								>
									{"<"}
								</button>

								<div className="flex min-w-0 items-center gap-3">
									<div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#ead9c2] bg-[#8b5e34] text-sm font-bold text-white shadow-sm">
										{profile?.avatar_url ? (
											<img
												src={profile.avatar_url}
												alt={displayName || "Profile avatar"}
												className="h-full w-full object-cover"
											/>
										) : (
											<span>{display.initials}</span>
										)}
									</div>
									<div className="min-w-0">
										<h1 className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">
											Hacienda Amara Chat
										</h1>
										<p className="text-xs text-slate-600 sm:text-sm">
											{isAdmin
												? adminAvailable
													? "Admin online"
													: "Admin offline"
												: adminOnline
													? "Admin online"
													: "Assistant ready"}
										</p>
										<p className="truncate text-[0.7rem] text-slate-700 sm:text-xs">
											{profile ? `Signed in as ${displayName}` : "Continue as Guest"}
										</p>
									</div>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2 lg:justify-end">
								<div className="text-left sm:text-right">
									<p className="text-xs text-slate-600">
										{isAdmin ? "Admin mode" : "Client chat"}
									</p>
									<p className="text-[0.7rem] text-slate-500">
										{isAdmin
											? adminAvailable
												? "Clients can message you live"
												: "Turn online to reply"
											: adminOnline
												? "Admin is available"
												: "Assistant will answer"}
									</p>
								</div>

								<button
									type="button"
									onClick={refreshMessages}
									disabled={loading || isRefreshing}
									className="btn btn-black btn-xs shrink-0 rounded-full px-3"
									aria-label="Refresh chat messages"
									title="Refresh chat messages"
								>
									{isRefreshing ? "Refreshing..." : "Refresh"}
								</button>

								<button
									type="button"
									onClick={clearCurrentChat}
									disabled={loading}
									className="btn btn-black btn-xs shrink-0 rounded-full px-3"
									aria-label="Clear current chat"
									title="Clear current chat"
								>
									Clear
								</button>

								{isAdmin ? (
									<button
										type="button"
										onClick={() => setAdminAvailable((current) => !current)}
										className="btn btn-black btn-xs shrink-0 rounded-full px-3"
									>
										{adminAvailable ? "Go offline" : "Go online"}
									</button>
								) : (
									<span className="shrink-0 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-base-content">
										{adminOnline ? "Admin online" : "Assistant ready"}
									</span>
								)}
							</div>
						</div>

						<div className="flex min-h-0 flex-1 flex-col bg-white/35">
							<div
								className="flex min-h-0 flex-1 flex-col"
								style={{
									backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,245,230,0.5))",
								}}
							>
								{!isAdmin && (
									<div className="border-b border-black/5 bg-white/75 px-4 py-4 backdrop-blur sm:px-5">
										<div className="mx-auto flex w-full max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
											<div className="max-w-2xl">
												<p className="text-xs uppercase tracking-[0.28em] text-base-content/55">
													Client support
												</p>
												<h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
													Clean, direct support
												</h2>
												<p className="mt-2 max-w-xl text-sm leading-6 text-base-content/75">
													Ask about rates, inclusions, availability, location, events, or policies. The assistant replies automatically when the admin is offline.
												</p>
											</div>

											<div className="flex flex-wrap gap-2">
												{CLIENT_CHAT_HIGHLIGHTS.map((item) => (
													<span
														key={item}
														className="rounded-full border border-black/5 bg-white px-3 py-2 text-[0.72rem] font-medium text-base-content/75"
													>
														{item}
													</span>
												))}
											</div>
										</div>
									</div>
								)}

								<div className="border-b border-black/5 bg-white/75 px-4 py-3 backdrop-blur sm:px-5">
									<p className="text-sm font-medium text-slate-900">
										{isAdmin
											? `Review and reply to ${activeThreadName}`
											: `Chat with Hacienda Amara support as ${displayName}`}
									</p>
									<p className="text-xs text-base-content/55">
										{isAdmin
											? "Pick a client conversation on the left and reply live."
											: adminOnline
												? "The admin is online and can see your messages."
												: "If the admin is offline, our assistant will answer automatically."}
									</p>
								</div>

								<div
									ref={messageListRef}
									onScroll={() => {
										shouldStickToBottomRef.current = isNearBottom();
									}}
									className="flex-1 min-h-0 overflow-y-auto px-2 py-4 sm:px-5"
								>
									<div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
										{loading ? (
											<div className="mx-auto mt-10 w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-black/5 bg-white/75 shadow-2xl backdrop-blur-xl">
												<div className="px-5 py-4">
													<p className="text-xs uppercase tracking-[0.26em] text-base-content/55">
														Preparing chat
													</p>
													<h3 className="mt-2 text-lg font-semibold text-slate-900">
														Loading your conversation
													</h3>
													<p className="mt-1 text-sm leading-6 text-base-content/75">
														We’re getting the latest messages and support details ready.
													</p>
												</div>
											</div>
										) : currentThreadMessages.length === 0 ? (
											<div className="mx-auto mt-10 w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-black/5 bg-white/75 shadow-2xl backdrop-blur-xl">
												<div className="px-5 py-4">
													<p className="text-xs uppercase tracking-[0.26em] text-base-content/55">
														Welcome
													</p>
													<h3 className="mt-2 text-lg font-semibold text-slate-900">
														Start a conversation
													</h3>
													<p className="mt-1 text-sm leading-6 text-base-content/75">
														Ask about availability, rates, amenities, location, or event setup.
													</p>
												</div>
											</div>
										) : (
											currentThreadMessages.map(renderMessage)
										)}

									</div>
								</div>

								<div className="border-t border-black/5 bg-white/75 px-3 py-3 backdrop-blur sm:px-5">
									<div className="mx-auto mb-3 w-full max-w-4xl rounded-[1.25rem] border border-black/5 bg-white px-3 py-3 shadow-sm">
										<div className="mb-3 flex items-center justify-between gap-3 px-1">
											<p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-base-content/55">
												Quick questions
											</p>
											<p className="text-[0.7rem] text-slate-500">
												Tap to start faster
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											{CLIENT_CHAT_PROMPTS.map((item) => (
												<button
													key={item}
													type="button"
													onClick={() => setPrompt(item)}
													className="rounded-full border border-black/5 bg-white px-3 py-2 text-[0.72rem] font-medium text-base-content/75 transition hover:bg-[#fff8ef]"
												>
													{item}
												</button>
											))}
										</div>
									</div>

									{error && (
										<div className="mx-auto mb-3 max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
											{error}
										</div>
									)}

									<p className="mx-auto mb-3 max-w-4xl text-[0.7rem] text-slate-500">
										Press Enter to send. Shift + Enter for a new line.
									</p>

									<form
										onSubmit={handleSubmit}
										className="mx-auto flex w-full max-w-4xl flex-col gap-2 sm:flex-row sm:items-end"
									>
										<input
											ref={photoInputRef}
											type="file"
											accept="image/*"
											capture="environment"
											className="hidden"
											onChange={(event) => handleAttachmentSelection(event, "image")}
										/>
										<input
											ref={videoInputRef}
											type="file"
											accept="video/*"
											className="hidden"
											onChange={(event) => handleAttachmentSelection(event, "video")}
										/>

										<div className="flex w-full gap-2 sm:w-auto sm:flex-col md:flex-row">
											<button
												type="button"
												onClick={() => photoInputRef.current?.click()}
												disabled={loading || isSending || (isAdmin && !adminAvailable)}
												className="btn btn-ghost w-full rounded-full border border-[#ead9c2] bg-white px-4 text-xs font-medium text-slate-700 hover:bg-[#fff8ef] sm:w-auto"
											>
												Photo
											</button>
											<button
												type="button"
												onClick={() => videoInputRef.current?.click()}
												disabled={loading || isSending || (isAdmin && !adminAvailable)}
												className="btn btn-ghost w-full rounded-full border border-[#ead9c2] bg-white px-4 text-xs font-medium text-slate-700 hover:bg-[#fff8ef] sm:w-auto"
											>
												Video
											</button>
										</div>

										<div className="w-full flex-1 rounded-[1.25rem] border border-[#ead9c2] bg-white px-4 py-2 shadow-sm sm:rounded-full">
											{draftAttachments.length > 0 && (
												<div className="mb-2 space-y-2">
													{draftAttachments.map((attachment) => (
														<div
															key={attachment.id || getAttachmentSource(attachment)}
															className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#ead9c2] bg-[#fffaf3] p-2 sm:flex-nowrap"
														>
															<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ead9c2] text-[0.7rem] font-semibold text-slate-700">
																{attachment.kind === "video" ? "VIDEO" : "PHOTO"}
															</div>
															<div className="min-w-0 flex-1">
																<p className="truncate text-xs font-medium text-slate-900">
																	{attachment.name}
																</p>
																<p className="text-[0.7rem] text-slate-500">
																	{attachment.kind === "video"
																		? "Ready to send as video"
																		: "Ready to send as photo"}
																</p>
															</div>
																<button
																	type="button"
																	onClick={() =>
																		setDraftAttachments((current) => {
																			const removed = current.find((item) => item.id === attachment.id);
																			revokePreviewUrl(removed);
																			return current.filter((item) => item.id !== attachment.id);
																		})
																	}
																className="ml-auto rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-[#ead9c2]/40 hover:text-slate-900"
															>
																Remove
															</button>
														</div>
													))}
												</div>
											)}

											<textarea
												value={prompt}
												onChange={(event) => setPrompt(event.target.value)}
												onKeyDown={handleKeyDown}
												placeholder={
													isAdmin && !adminAvailable
														? "Go online to reply..."
														: "Write a message..."
												}
												rows={1}
												disabled={isSending || (isAdmin && !adminAvailable)}
												className="max-h-28 w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
											/>
										</div>

										<button
											type="submit"
											disabled={(!prompt.trim() && draftAttachments.length === 0) || loading || isSending || (isAdmin && !adminAvailable)}
											className="btn btn-black rounded-full px-5 sm:w-auto"
										>
											{isSending ? "Sending..." : "Send"}
										</button>
									</form>
								</div>
							</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{selectedMedia && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
					role="dialog"
					aria-modal="true"
					onClick={() => setSelectedMedia(null)}
				>
					<div
						className="relative w-full max-w-4xl overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-2xl"
						onClick={(event) => event.stopPropagation()}
					>
						<button
							type="button"
							onClick={() => setSelectedMedia(null)}
							className="absolute right-3 top-3 z-10 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
						>
							Close
						</button>

						{selectedMedia.kind === "video" ? (
							<video
								controls
								autoPlay
								playsInline
								className={mediaViewerClassName}
								src={getAttachmentSource(selectedMedia)}
							>
								<source src={getAttachmentSource(selectedMedia)} type={selectedMedia.mimeType || "video/mp4"} />
							</video>
						) : (
							<img
								src={getAttachmentSource(selectedMedia)}
								alt={selectedMedia.name || "Attached media"}
								className={mediaViewerClassName}
							/>
						)}

						<div className="border-t border-white/10 px-4 py-3 text-sm text-white/80">
							<p className="truncate font-medium text-white">
								{selectedMedia.name || (selectedMedia.kind === "video" ? "Video" : "Photo")}
							</p>
							<p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
								Tap outside or Close to return to chat
							</p>
						</div>
					</div>
				</div>
			)}
		</MainLayout>
	);
};

export default Chat;
