import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";

// List of allowed resort-related keywords
const RESORT_KEYWORDS = [
	'hacienda amara', 'resort', 'event', 'booking', 'booking', 'reservation', 'booking',
	'amenities', 'amenity', 'facility', 'facilities', 'pool', 'pool', 'jacuzzi', 'kiddie pool',
	'barkada room', 'room', 'bed', 'beds', 'ac', 'aircon', 'air condition',
	'jbl', 'speaker', 'microphone', 'dining', 'table', 'kitchen', 'refrigerator',
	'water dispenser', 'rice cooker', 'microwave', 'cookware', 'tableware',
	'bathroom', 'heater', 'parking', 'games', 'wifi', 'internet', 'gas stove',
	'mineral water', 'heated pool', 'gas stove',
	'rates', 'rate', 'price', 'price', 'price', 'price', 'price', 'price',
	'down payment', 'full payment', 'payment', 'payment', 'gcash', 'bdo',
	'location', 'address', 'where', 'where', 'where', 'map', 'map', 'directions',
	'rules', 'rules', 'rules', 'policy', 'guidelines', 'guidelines', 'bawal',
	'facebook', 'fb', 'facebook', 'qr', 'qr', 'scan', 'scan',
	'events', 'event', 'birthday', 'wedding', 'debut', 'corporate', 'coordinator',
	'sound system', 'lighting', 'electricity', 'power', 'decorations', 'decorate',
	'rehearsal', 'corkage', 'guest list', 'extend', 'cleaning', 'security deposit',
	'site visit', 'inspect', 'book early', 'availability', 'available', 'slot',
	'booking', 'reserve', 'overnight', 'day tour', 'guests', 'capacity',
	'parking', 'food', 'drinks', 'drinks', 'extra hours', 'overtime',
	'sound system', 'lighting', 'electricity', 'power', 'decorations', 'rehearsal',
	'corkage', 'guest list', 'extend', 'cleaning', 'deposit', 'site visit',
	'book early', 'availability', 'overnight', 'day tour', 'guests', 'capacity',
	'parking', 'food', 'drinks', 'extra hours', 'overtime',
	'corkage', 'guest list', 'extend', 'cleaning', 'deposit', 'site visit',
	'book early', 'parking', 'food', 'drinks', 'extra hours', 'overtime',
	'gas stove', 'mineral water', 'gas stove', 'mineral water',
	'kids', 'children', 'kids', 'children', 'pets', 'pets',
	'wi-fi', 'wifi', 'internet', 'internet', 'internet',
	'access', 'setup', 'setup', 'coordinator', 'coordinator',
	'corkage', 'guest list', 'extend', 'cleaning', 'deposit', 'site visit',
	'book early', 'parking', 'food', 'drinks', 'extra hours', 'overtime',
];

function isResortRelated(text) {
	const lowerText = text.toLowerCase().trim();
	// Check if the message contains any resort-related keywords
	return RESORT_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

const SYSTEM_PROMPT = `You are Hacienda Amara's AI assistant. You MUST answer using ONLY the knowledge base below. Never say "I don't know" or "I'm not sure." If a question isn't directly covered, give the most relevant information from the knowledge base.

=== KNOWLEDGE BASE (MEMORIZE THIS) ===

LOCATION:
- Address: B30 L12 Itneg Street Phase 3 Amityville, Brgy. San Jose, Rodriguez, Rizal 1860
- Google Maps: https://www.google.com/maps/search/?api=1&query=Hacienda%20Amara%20Private%20Resort
- Location QR code available

RATES 2026 (for 20 pax):
- Day Time (9AM-6PM): ₱6,999 Mon-Thu / ₱7,999 Fri-Sun
- Night Time (9PM-6AM): ₱7,999 Mon-Thu / ₱8,999 Fri-Sun
- Overnight (21 hours): ₱14,999 Mon-Thu / ₱17,999 Fri-Sun
- Extra guests: ₱200/head
- Kids 8 and below: FREE
- Down payment required to secure reservation
- Full payment before or on event date

AMENITIES:
- 4ft outdoor pool
- Jacuzzi/kiddie pool (2 free hours)
- Heated pool: ₱1,000/hour
- AC barkada room: 2 queen beds + 3 bunk beds (sleeps up to 25)
- JBL PartyBox Ultimate speaker with 2 wireless microphones
- 12-seat dining table
- Kitchen: refrigerator, hot/cold water dispenser, rice cooker, microwave, cookware, 30 tableware sets
- 2 bathrooms with heaters
- Front gate & side parking
- Games & WiFi (Converge + PointLink)
- Gas stove: ₱300 (9hrs) / ₱400 (21hrs)
- Mineral water: 1 free gallon, then ₱50/gallon

RULES:
- No food/drinks in pool
- Designated smoking area only
- No glass bottles near water
- Check-in/out times per package
- Pets allowed with prior approval
- Decorations allowed with guidelines
- Security deposit may be required (refundable)
- Overtime charges apply
- Basic cleaning included, extra cleanup for excessive mess
- Guest list recommended
- Site visits by appointment

PAYMENT:
- GCash: Mara Jane Garcia - 0968-326-0522
- BDO: Mara Jane Garcia - 0101-6000-5035
- Payment QR code available
- Down payment required
- Full payment before/on event date

EVENTS & BOOKINGS:
- Day Time, Night Time, Overnight packages
- Birthdays, weddings, debuts, corporate events
- Event setup assistance available
- Coordinator recommendations
- Sound system & lighting available as add-ons
- Rehearsals by arrangement
- Corkage fees may apply
- Extensions possible with additional fees
- Book early for peak dates

CONTACT:
- Facebook: facebook.com/HaciendaAmara
- Facebook QR code available
- Photos/videos available upon request

=== STRICT RULES ===
1. Answer ONLY from this knowledge base
2. NEVER say "I don't know", "I'm not sure", "I cannot answer"
3. If asked about something not listed, give the closest relevant info from above
4. Be direct and specific - include exact prices, addresses, details
5. Use Taglish for Tagalog questions
6. Include links (Maps, Facebook) and mention QR codes when relevant`;

async function callGroq(messages) {
	if (!GROQ_API_KEY) {
		throw new Error("GROQ_API_KEY not configured");
	}

	const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${GROQ_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: GROQ_MODEL,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				...messages,
			],
			max_tokens: 800,
			temperature: 0.3,
			stream: true,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Groq API error: ${error}`);
	}

	return response.body;
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

export async function POST(request) {
	let body;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid request body." }, { status: 400 });
	}

	const messages = body?.messages ?? [];
	const userText = getTextFromMessages(messages);

	// Check if question is resort-related
	if (!isResortRelated(userText)) {
		return Response.json({ 
			error: "I can only answer questions about Hacienda Amara resort. Please ask about amenities, rates, bookings, location, rules, events, or other resort-related topics." 
		}, { status: 400 });
	}

	if (!GROQ_API_KEY) {
		return Response.json({ error: "AI not configured" }, { status: 503 });
	}

	try {
		const stream = await callGroq(messages.map(m => ({ role: m.role, content: m.parts?.[0]?.text || "" })));

		const uiStream = createUIMessageStream({
			execute: async ({ writer }) => {
				const messageId = `msg-${Date.now()}`;
				const textId = `text-${Date.now()}`;

				writer.write({ type: "start", messageId });
				writer.write({ type: "text-start", id: textId });

				const reader = stream.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						const lines = chunk.split("\n").filter(line => line.trim());

						for (const line of lines) {
							if (line.startsWith("data: ")) {
								const data = line.slice(6);
								if (data === "[DONE]") continue;

								try {
									const parsed = JSON.parse(data);
									const delta = parsed.choices?.[0]?.delta?.content;
									if (delta) {
										writer.write({ type: "text-delta", id: textId, delta });
									}
								} catch {
									// ignore parse errors
								}
							}
						}
					}
				} finally {
					writer.write({ type: "text-end", id: textId });
					writer.write({ type: "finish", finishReason: "stop" });
				}
			},
		});

		return createUIMessageStreamResponse({ stream: uiStream });
	} catch (error) {
		console.error("AI chat error:", error);
		return Response.json({ error: "AI temporarily unavailable" }, { status: 503 });
	}
}