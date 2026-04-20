import {
	createUIMessageStream,
	createUIMessageStreamResponse,
} from "ai";

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
