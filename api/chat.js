import {
	createUIMessageStream,
	createUIMessageStreamResponse,
} from "ai";

const INAPPROPRIATE_WORDS = [
	// English
	"sex", "fuck", "shit", "bitch", "asshole", "bastard", "damn", "cunt", "dick", "pussy", "cock", "cum", "porn", "nude", "naked", "horny", "orgasm", "masturbate", "blowjob", "handjob", "anal", "oral", "vagina", "penis", "boobs", "tits", "ass", "whore", "slut", "pimp", "hoe", "thot", "rape", "molest", "pedophile", "kill", "murder", "suicide", "die", "hate", "stupid", "idiot", "moron", "retard", "gay", "fag", "faggot", "tranny", "shemale", "nigger", "nigga", "chink", "spic", "kike", "terrorist", "bomb", "weapon", "gun", "knife", "drugs", "cocaine", "heroin", "meth", "weed", "marijuana",
	// Tagalog
	"kantot", "kantutin", "kantot ka", "puta", "putang ina", "putangina", "tangina", "tang ina", "gago", "gaga", "bobo", "boba", "ulol", "ulul", "leche", "lintik", "buang", "sira ulo", "hayop", "demonyo", "puta ka", "putang ina mo", "tangina mo", "gago ka", "bobo ka", "ulol ka", "leche ka", "kantot mo", "kantutin mo", "jakol", "jakulan", "jajakol", "boso", "bosas", "malibog", "libog", "kinantot", "kinakantot", "kantutin kita", "kantot tayo", "sex", "seks", "seksing", "kabit", "kerida", "querida", "puki", "titi", "bayag", "susmaryosep", "pakshet", "pak yu", "fuck you", "putang ina nyo"
];

function containsInappropriate(text) {
	const lower = text.toLowerCase();
	return INAPPROPRIATE_WORDS.some(word => lower.includes(word.toLowerCase()));
}

const RESORT_KEYWORDS = [
	"resort", "hacienda", "amara", "pool", "jacuzzi", "jacuzzy", "room", "rate", "price", "booking", "reservation", "event", "wedding", "party", "venue", "amenities", "facilities", "location", "address", "direction", "map", "waze", "google maps", "contact", "phone", "email", "rules", "policy", "guideline", "payment", "pay", "gcash", "bdo", "transfer", "deposit", "overnight", "daytime", "nighttime", "package", "promo", "discount", "capacity", "guest", "pax", "kid", "children", "child", "food", "drink", "alcohol", "catering", "sound", "music", "karaoke", "videoke", "parking", "security", "staff", "admin", "manager", "owner", "schedule", "time", "hour", "checkin", "checkout", "check in", "check out", "availability", "available", "book", "reserve", "cancel", "refund", "review", "feedback", "complaint", "suggestion", "inquiry", "question", "help", "support", "problem", "issue", "concern",
	// Tagalog
	"presyo", "magkano", "bayad", "magbabayad", "reserba", "book", "event", "kasal", "binyag", "debut", "birthday", "celebration", "pasyal", "staycation", "bakasyon", "bakasyon", "palipad", "tawid", "sakay", "punta", "punta tayo", "saan", "nasaan", "address", "lugar", "pook", "pasok", "labas", "oras", "oras", "gabi", "umaga", "tanghali", "hapon", "buwan", "buwan", "linggo", "araw", "taon", "taon", "taon", "taon"
];

function isResortRelated(text) {
	const lower = text.toLowerCase();
	return RESORT_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()));
}

const getTextFromMessages = (messages = []) => {
	const lastUserMessage = [...messages]
		.reverse()
		.find((message) => message.role === "user");

	if (!lastUserMessage) return "";

	return (
		lastUserMessage.parts
			?.filter((part) => part.type === "text")
			.map((part) => part.text)
			.join("") || ""
	);
};

const getReply = (userText) => {
	// Check inappropriate words first
	if (containsInappropriate(userText)) {
		return "I'm sorry, but I can't respond to that. Please keep our conversation respectful and appropriate.";
	}

	// Check if resort-related
	if (!isResortRelated(userText)) {
		return "I can only help with questions about Hacienda Amara Resort - rates, bookings, events, amenities, location, payments, rules, and packages. Please ask me about the resort!";
	}

	const t = userText.toLowerCase();

	if (t.includes("scan") || t.includes("qr")) {
		return "Open the Scan QR page from the menu, allow camera access, then point your camera at the QR code. It will take you directly to the matching page.";
	}

	if (t.includes("profile")) {
		return "Go to Profile from the menu. If you need to edit it, choose Edit Profile and save your changes when you're done.";
	}

	if (t.includes("event")) {
		return "Use Events if you're a user or Manage Events if you're an admin. From there you can view, edit, or manage event details.";
	}

	if (t.includes("setting")) {
		return "Open Settings from the profile menu to update preferences, password, and other account options.";
	}

	if (t.includes("home")) {
		return "The home page is the starting point. Use Get Started to go to your role-based page.";
	}

	if (
		t.includes("location") || t.includes("saan") || t.includes("address") ||
		t.includes("map") || t.includes("directions") || t.includes("waze") ||
		t.includes("google maps") || t.includes("pumunta")
	) {
		return "Our exact location is: B30 L12 Itneg Street Phase 3 Amityville Bgry. San Jose, Rodriguez, Rizal, Philippines.\n\nGoogle Maps: https://www.google.com/maps/search/?api=1&query=Hacienda%20Amara%20Private%20Resort\n\nThe assistant will also send you our location QR code image shortly!";
	}

	if (
		t.includes("rate") || t.includes("price") || t.includes("presyo") ||
		t.includes("magkano") || t.includes("cost") || t.includes("fee")
	) {
		return "Here are our 2026 rates:\n\n• Day Time (9AM-6PM): P6,999 Mon-Thu / P7,999 Fri-Sun\n• Night Time (9PM-6AM): P7,999 Mon-Thu / P8,999 Fri-Sun\n• Overnight (21 Hours): P14,999 Mon-Thu / P17,999 Fri-Sun\n\nRates are good for 20 pax. Additional guests: P200/head. Kids 8 and below are FREE.";
	}

	if (
		t.includes("rules") || t.includes("policy") || t.includes("bawal") ||
		t.includes("guidelines")
	) {
		return "Para sa safety at cleanliness ng lahat, mayroon kaming mga Rules gaya ng: bawal ang food/drinks sa pool, may designated smoking area, at bawal ang glass bottles malapit sa tubig. Maaari niyo pong basahin ang kumpletong guidelines dito: Rules";
	}

	if (
		t.includes("pay") || t.includes("bayad") || t.includes("payment") ||
		t.includes("magbabayad") || t.includes("gcash") || t.includes("bdo")
	) {
		return "Scan here to complete payment\n\nGCASH\nMara Jane Garcia\n0968-326-0522\n\nBDO Unibank, Inc.\nMara Jane Garcia\n0101-6000-5035\n\nThe assistant will send the QR code shortly!";
	}

	if (
		t.includes("about") || t.includes("amenities") || t.includes("features") ||
		t.includes("facility") || t.includes("facilities") || t.includes("pool") ||
		t.includes("jacuzzi")
	) {
		return "Hacienda Amara Private Resort and Events Place, located in Amityville, Brgy. San Jose, Rodriguez, Rizal, is a private, events-focused venue featuring an infinity pool, heated jacuzzi, and air-conditioned living spaces. It accommodates up to 70 guests (20-22 overnight) with full amenities for private parties, staycations, and group retreats. For more details, please visit our About Us page.";
	}

	return "I can help with events, profiles, settings, rates, location, and general info. You can also visit our About Us page for full details on amenities.";
};

const buildStreamResponse = (reply) => {
	const stream = createUIMessageStream({
		execute: ({ writer }) => {
			const messageId = `msg-${Date.now()}`;
			const textId = `text-${Date.now()}`;

			writer.write({ type: "start", messageId });
			writer.write({ type: "text-start", id: textId });
			writer.write({ type: "text-delta", id: textId, delta: reply });
			writer.write({ type: "text-end", id: textId });
			writer.write({ type: "finish", finishReason: "stop" });
		},
	});

	return createUIMessageStreamResponse({ stream });
};

export async function POST(request) {
	let body;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid request body." }, { status: 400 });
	}

	const messages = body?.messages ?? [];
	const userText = getTextFromMessages(messages);
	const reply = getReply(userText);

	return buildStreamResponse(reply);
}
