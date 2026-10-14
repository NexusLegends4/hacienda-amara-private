const PROHIBITED_WORDS = [
	"puta", "putangina", "tangina", "gago", "gaga", "bobo", "boba", "ulol", "ulul",
	"tanga", "tarantado", "tarantada", "punyeta", "pakshet", "pakyu", "pukingina",
	"pucha", "leche", "lintik", "bwisit", "buwisit", "yawa", "kantot", "kantutin",
	"jakol", "jakulan", "puki", "titi", "bayag", "libog", "malibog", "burat", "iyot",
	"kupal", "hinayupak", "animal ka", "hayop ka", "fuck", "fucking", "fucker", "motherfucker",
	"shit", "bullshit", "bitch", "bastard", "asshole", "dickhead", "dick", "pussy", "cunt",
	"cock", "whore", "slut", "porn", "nude", "naked", "horny", "sex", "seks", "sexual",
	"blowjob", "handjob", "masturbate", "orgasm", "vagina", "penis", "boobs", "tits", "rape",
	"molest", "pedophile", "nigger", "nigga", "fag", "faggot", "retard", "tranny", "murder",
	"suicide", "bomb", "weapon",
];

const HARASSMENT_PHRASES = [
	"kill you", "i will kill", "i'll kill", "patayin kita", "papatayin kita",
	"mamatay ka", "i hate you", "you are stupid", "you're stupid", "bobo ka",
	"gago ka", "ulol ka", "putang ina mo", "tangina mo", "puta ka",
];

const TOPIC_TERMS = [
	"hacienda", "amara", "resort", "booking", "reservation", "reserve", "availability",
	"available", "cottage", "pool", "jacuzzi", "barkada room", "ac room", "aircon", "amenity", "amenities", "facility",
	"facilities", "rate", "rates", "price", "pricing", "fee", "fees", "payment", "gcash", "bdo",
	"deposit", "refund", "cancel", "cancellation", "check in", "check-in", "check out", "check-out",
	"policy", "policies", "rule", "rules", "location", "address", "direction", "directions", "map",
	"operating hours", "schedule", "event", "wedding", "birthday", "debut", "overnight", "day tour",
	"night tour", "extra guests", "guest list", "how many guests", "guest capacity", "children", "kids", "bring food", "outside food", "food policy", "drink policy", "bring water", "catering", "corkage", "pax", "parking", "pet", "wifi",
	"reservation status", "website", "login", "sign in", "profile", "technical",
	"upload", "chat", "assistant", "photo", "video", "presyo", "magkano", "bayad", "reserba",
	"nasaan", "address", "oras", "gabi", "umaga", "bawal", "pwede", "puwede",
	"available po", "pa-book", "pa book",
	"smoking", "smoke", "glass bottle", "weekday", "weekend", "site visit", "ocular",
];

const FOLLOW_UP_PATTERN = /^(what about|how about|and |what time|how much|how many|is it|are they|can we|can i|do you|does it|which one|that date|that day|sa weekend|sa weekdays|pwede ba|puwede ba|paano|saan|nasaan|ilan|magkano)\b/i;
const PRIVATE_DATA_REQUEST_PATTERN = /\b(another|other|someone else'?s|all other)\b.{0,80}\b(reservation|booking|profile|contact|email|phone|payment|personal details)\b|\b(show|reveal|give|list|tell me|print|repeat)\b.{0,50}\b(system prompt|system instructions|secret key|api key|credentials|access token)\b/i;
const ROLE_OVERRIDE_PATTERN = /\b(ignore|bypass|override|forget)\b.{0,40}\b(instructions|rules|guardrails|restrictions|system prompt)\b|\b(reveal|repeat|print|show)\b.{0,40}\b(system prompt|hidden instructions)\b/i;
const OFF_TOPIC_INTENT_PATTERN = /\b(homework|school assignment|essay|programming assignment|write code|debug my code|politics|political party|movie recommendation|celebrity gossip|song lyrics|capital of (?!hacienda))\b/i;
const WEBSITE_TECH_SUPPORT_PATTERN = /\b(website|reservation system|booking page|login page|chat page|account page)\b/i;

const normalizeCharacters = (value) => String(value || "")
	.normalize("NFKD")
	.replace(/[\u0300-\u036f]/g, "")
	.toLowerCase()
	.replace(/[0@]/g, (char) => char === "0" ? "o" : "a")
	.replace(/[1|]/g, "i")
	.replace(/3/g, "e")
	.replace(/[4]/g, "a")
	.replace(/[5$]/g, "s")
	.replace(/7/g, "t");

const buildObfuscatedPattern = (term) => {
	const normalized = normalizeCharacters(term).replace(/[^a-z0-9]+/g, " ").trim();
	const wordPattern = normalized
		.split(/\s+/)
		.map((word) => [...word].map((character) => `${character}+`).join("[\\W_]*"))
		.join("[\\W_]+");
	return new RegExp(`(?:^|[^a-z0-9])${wordPattern}(?:$|[^a-z0-9])`, "i");
};

const PROHIBITED_PATTERNS = [...PROHIBITED_WORDS, ...HARASSMENT_PHRASES].map(buildObfuscatedPattern);
const TOPIC_PATTERN = new RegExp(`(?:^|[^a-z0-9])(?:${TOPIC_TERMS
	.map((term) => normalizeCharacters(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
	.join("|")})(?:$|[^a-z0-9])`, "i");

export const CHAT_MAX_MESSAGE_LENGTH = 1200;
export const CHAT_RATE_LIMIT = 10;
export const OFF_TOPIC_REPLY = "I'm sorry, but I can only assist with questions and concerns related to Hacienda Amara Private Resort, including reservations, availability, pricing, facilities, and resort policies.";
export const INAPPROPRIATE_MESSAGE_REPLY = "Your message contains inappropriate language. Please use respectful language and keep your message related to Hacienda Amara.";

export const normalizeChatText = (text) => normalizeCharacters(text)
	.replace(/[^a-z0-9]+/g, " ")
	.trim()
	.replace(/\s+/g, " ");

export const moderateChatText = (text, { context = "", role = "client" } = {}) => {
	const value = String(text || "").trim();
	if (!value) return { allowed: false, reason: "empty", message: "Write a message before sending." };
	if (value.length > CHAT_MAX_MESSAGE_LENGTH) {
		return { allowed: false, reason: "too_long", message: "Messages must be 1,200 characters or fewer." };
	}

	const normalized = normalizeCharacters(`${context} ${value}`);
	if (PROHIBITED_PATTERNS.some((pattern) => pattern.test(normalized))) {
		return { allowed: false, reason: "inappropriate", message: INAPPROPRIATE_MESSAGE_REPLY };
	}
	if (PRIVATE_DATA_REQUEST_PATTERN.test(value)) {
		return { allowed: false, reason: "sensitive", message: "For privacy and security, I can’t share private customer details or internal system information." };
	}
	if (ROLE_OVERRIDE_PATTERN.test(value)) {
		return { allowed: false, reason: "sensitive", message: "I can only assist with Hacienda Amara questions and website support." };
	}

	const topicText = normalizeChatText(value);
	const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|thank you|thanks|salamat|sige|okay|ok|opo|po)[.!?\s]*$/i.test(topicText);
	const isContextualFollowUp = value.length <= 100
		&& FOLLOW_UP_PATTERN.test(topicText)
		&& TOPIC_PATTERN.test(normalizeChatText(context));
	const hasStaffScope = role === "admin" || role === "staff";
	if (OFF_TOPIC_INTENT_PATTERN.test(value) && !WEBSITE_TECH_SUPPORT_PATTERN.test(value)) {
		if (!hasStaffScope) return { allowed: false, reason: "off_topic", message: OFF_TOPIC_REPLY };
	}
	if (/(.)\1{11,}/iu.test(value) || (value.length >= 32 && !/[aeiou]/i.test(normalizeCharacters(value)))) {
		return { allowed: false, reason: "spam", message: "That message looks like spam. Please send a clear Hacienda Amara question." };
	}
	if (!hasStaffScope && !isGreeting && !TOPIC_PATTERN.test(topicText) && !isContextualFollowUp) {
		return { allowed: false, reason: "off_topic", message: OFF_TOPIC_REPLY };
	}

	return { allowed: true, reason: "allowed", message: "" };
};

export const moderateAssistantText = (text) => {
	const value = String(text || "").trim();
	if (!value || PROHIBITED_PATTERNS.some((pattern) => pattern.test(normalizeCharacters(value)))) {
		return { allowed: false, reason: "inappropriate" };
	}
	if (/\b(system prompt|system instructions|secret key|api key|access token|password|private customer data|another (user|guest|client)'s (reservation|booking|profile|contact))\b/i.test(value)) {
		return { allowed: false, reason: "sensitive" };
	}
	if (!TOPIC_PATTERN.test(normalizeCharacters(value).replace(/[^a-z0-9]+/g, " "))) {
		return { allowed: false, reason: "off_topic" };
	}
	return { allowed: true, reason: "allowed" };
};
