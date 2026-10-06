import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are Hacienda Amara's AI assistant. Hacienda Amara is a private resort and events place in Rodriguez, Rizal, Philippines.

=== COMPLETE KNOWLEDGE BASE ===

LOCATION & MAP:
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

AMENITIES & FACILITIES:
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

RULES & POLICIES:
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

CONTACT & SOCIAL:
- Facebook: facebook.com/HaciendaAmara
- Facebook QR code available
- Photos/videos available upon request

=== RESPONSE STYLE ===
- Be helpful, friendly, and concise
- Answer in Taglish when user writes in Tagalog
- Use bullet points for lists
- Include relevant links (Maps, Facebook) when asked
- Mention QR codes for location/payment/Facebook when relevant`;

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
			temperature: 0.5,
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