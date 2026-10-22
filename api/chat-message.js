import { createClient } from "@supabase/supabase-js";
import { isValidVideoPoster } from "../src/utils/chat-media.js";
import { moderateAssistantText, moderateChatText } from "../src/utils/chat-moderation.js";
import { classifyChatMessage } from "../server/utils/groq-moderation.js";

const MEDIA_PREFIX = "__HACIENDA_MEDIA__";
const MEDIA_BUCKET = "chat-media";
const MAX_BODY_BYTES = 131_072;
const SIGNED_URL_SECONDS = 15 * 60;
const SAFE_ASSISTANT_REPLY = "For current availability, reservation status, and details that need confirmation, please contact authorized Hacienda Amara staff.";
const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm",
]);
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const sendTimes = new Map();

const isRateLimited = (userId) => {
	const now = Date.now();
	const recent = (sendTimes.get(userId) || []).filter((time) => now - time < RATE_WINDOW_MS);
	if (recent.length >= RATE_LIMIT) {
		sendTimes.set(userId, recent);
		return true;
	}
	recent.push(now);
	sendTimes.set(userId, recent);
	if (sendTimes.size > 1000) {
		for (const [id, times] of sendTimes) if (!times.some((time) => now - time < RATE_WINDOW_MS)) sendTimes.delete(id);
	}
	return false;
};

const getConfiguration = () => {
	const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
	if (!url || !anonKey) throw new Error("Chat server configuration is missing.");
	return { url, anonKey, serviceKey: serviceKey || "" };
};

const parsePayload = (content) => {
	if (typeof content !== "string") throw new Error("Message could not be verified; please try again.");
	if (!content.startsWith(MEDIA_PREFIX)) return { text: content, attachments: [] };
	try {
		const payload = JSON.parse(content.slice(MEDIA_PREFIX.length));
		return {
			text: typeof payload.content === "string" ? payload.content : "",
			attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
		};
	} catch {
		throw new Error("Message could not be verified; please try again.");
	}
};

const encodePayload = (text, attachments) => attachments.length
	? `${MEDIA_PREFIX}${JSON.stringify({ content: text, attachments })}`
	: text;

const getRecentContext = async (serviceClient, conversationKey) => {
	const { data, error } = await serviceClient
		.from("chat_messages")
		.select("content")
		.eq("conversation_key", conversationKey)
		.order("created_at", { ascending: false })
		.limit(4);
	if (error) throw error;
	// Older chat rows may contain attachment payloads from earlier versions.
	// Ignore malformed historical rows so one bad record cannot block every
	// subsequent message in that conversation.
	return (data || []).reverse().flatMap(({ content }) => {
		try {
			return [parsePayload(content).text];
		} catch {
			return [];
		}
	}).join(" ").slice(-2400);
};

const getJwtClaims = (token) => {
	try {
		const encoded = token.split(".")[1];
		return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
	} catch {
		return {};
	}
};

const verifyStaff = (claims) => claims.aal === "aal2"
	|| (claims.aal === "aal1" && Array.isArray(claims.amr) && claims.amr.some((item) => item?.method === "otp"));

const makeResponse = (status, payload, headers = {}) => Response.json(payload, { status, headers });

export async function POST(request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
	if (!token) return makeResponse(401, { error: "Secure chat sign-in is required." });

	let body;
	try {
		const rawBody = await request.text();
		if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
			return makeResponse(413, { error: "Chat request is too large." });
		}
		body = JSON.parse(rawBody);
	} catch {
		return makeResponse(400, { error: "Invalid request body." });
	}

	const message = body?.message;
	if (!message || typeof message !== "object") return makeResponse(400, { error: "Invalid chat message." });
	let conversationKey = String(message.conversationKey || message.conversation_key || "");
	const messageId = String(message.id || "");
	if (!/^[a-zA-Z0-9-]{1,80}$/.test(conversationKey) || !/^[a-zA-Z0-9-]{1,80}$/.test(messageId)) {
		return makeResponse(400, { error: "Message could not be verified; please try again." });
	}

	let configuration;
	let authClient;
	let serviceClient;
	let user;
	let profile;
	let verificationStage = "server configuration";
	try {
		configuration = getConfiguration();
		// Validate browser sessions with the same public project key used by the
		// frontend, then run every database operation with the caller's own
		// session so the row-level security policies stay in charge.
		authClient = createClient(configuration.url, configuration.anonKey, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
		const { data, error } = await authClient.auth.getUser(token);
		if (error || !data.user) {
			console.warn("Chat session verification rejected:", error?.status || "no status", error?.code || "no code", error?.message || "no user");
			return makeResponse(401, { error: "Secure chat sign-in is required. Please reload the page and sign in again." });
		}
		user = data.user;

		// Work through the caller's own session instead of a service-role key so
		// the database policies decide what this participant may read or write.
		serviceClient = createClient(configuration.url, configuration.anonKey, {
			auth: { persistSession: false, autoRefreshToken: false },
			global: { headers: { Authorization: `Bearer ${token}` } },
		});

		verificationStage = "participant profile lookup";
		const { data: profileRow, error: profileError } = await serviceClient
			.from("profiles")
			.select("id, firstname, lastname, role")
			.eq("id", user.id)
			.maybeSingle();
		if (profileError) throw profileError;
		profile = profileRow;
	} catch (error) {
		console.error(`Unable to verify chat submission (${verificationStage}):`, {
			code: error?.code,
			message: error?.message,
			details: error?.details,
			hint: error?.hint,
			stage: verificationStage
		});
		
		// Provide more specific error messages based on the error
		if (error?.code === 'PGRST301' || error?.message?.includes('JWT') || error?.message?.includes('service_role')) {
			return makeResponse(503, { error: "Chat service configuration error. Please check Supabase service role key." });
		}
		if (error?.code === '42501' || error?.message?.includes('permission denied') || error?.message?.includes('row-level security') || error?.message?.includes('policy')) {
			return makeResponse(503, { error: "Database permissions not configured. Please run the chat policies migration in Supabase." });
		}
		if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
			return makeResponse(503, { error: "Chat tables not found. Please run database migrations in Supabase." });
		}
		
		// Return the actual error for debugging
		return makeResponse(503, { 
			error: "Chat verification failed", 
			details: error?.message || "Unknown error",
			code: error?.code
		});
	}

	const requestedRole = String(message.senderRole || message.sender_role || "");
	const isAssistant = requestedRole === "bot";
	const clientRole = user.is_anonymous || profile?.role === "client";
	const staffRole = ["admin", "staff"].includes(profile?.role) ? profile.role : "";
	if (clientRole) {
		if (!(["client", "bot"].includes(requestedRole)) || (!isAssistant && conversationKey !== user.id && conversationKey !== 'guest')) {
			return makeResponse(403, { error: "Message could not be verified; please try again." });
		}
		if (isAssistant) conversationKey = user.id;
	} else if (staffRole) {
		if (!verifyStaff(getJwtClaims(token)) || requestedRole !== staffRole) {
			return makeResponse(403, { error: "Staff chat requires verified sign-in." });
		}
		const { data: conversation, error } = await serviceClient
			.from("chat_messages")
			.select("id")
			.eq("conversation_key", conversationKey)
			.eq("sender_role", "client")
			.limit(1);
		if (error) {
			console.error("Unable to verify staff chat conversation:", error.code || "no code", error.message || error);
			return makeResponse(503, { error: "Unable to check this chat right now. Please refresh the conversation list." });
		}
		if (!conversation?.length) {
			return makeResponse(403, { error: "This conversation has no saved client message. Refresh the conversation list and select an active chat." });
		}
	} else {
		return makeResponse(403, { error: "Chat participant could not be verified." });
	}
	if (!isAssistant && isRateLimited(user.id)) {
		return makeResponse(429, { error: "Too many messages sent; please wait a minute before trying again." }, { "Retry-After": "60" });
	}

	let parsedMessage;
	try {
		parsedMessage = parsePayload(message.content);
	} catch (error) {
		return makeResponse(400, { error: error.message || "Message could not be verified; please try again." });
	}
	let { text, attachments: rawAttachments } = parsedMessage;
	if (!isAssistant && rawAttachments.length > 0) {
		return makeResponse(400, { error: "Photos and videos can only be shared through Reviews." });
	}
	if (rawAttachments.length > 2) return makeResponse(400, { error: "Too many attachments." });
	const attachments = [];
	for (const attachment of rawAttachments) {
		if (!attachment || !["image", "video"].includes(attachment.kind) || !ALLOWED_MIME_TYPES.has(attachment.mimeType)) {
			return makeResponse(400, { error: "Attachment could not be verified." });
		}
		if (attachment.kind === "image" && !attachment.mimeType.startsWith("image/")) {
			return makeResponse(400, { error: "Attachment could not be verified." });
		}
		if (attachment.kind === "video" && !attachment.mimeType.startsWith("video/")) {
			return makeResponse(400, { error: "Attachment could not be verified." });
		}
		const poster = isValidVideoPoster(attachment.poster) ? attachment.poster : "";

		if (attachment.path) {
			if (attachment.bucket !== MEDIA_BUCKET || !attachment.path.startsWith(`conversations/${conversationKey}/`)) {
				return makeResponse(403, { error: "Attachment could not be verified." });
			}
			const { data: signed, error } = await serviceClient.storage
				.from(MEDIA_BUCKET)
				.createSignedUrl(attachment.path, SIGNED_URL_SECONDS);
			if (error) return makeResponse(400, { error: "Attachment could not be verified." });
			attachments.push({
				id: String(attachment.id || messageId).slice(0, 80),
				kind: attachment.kind,
				name: attachment.kind === "video" ? "Video" : "Photo",
				mimeType: attachment.mimeType,
				url: signed.signedUrl,
				path: attachment.path,
				bucket: MEDIA_BUCKET,
				...(poster ? { poster } : {}),
			});
		} else if (isAssistant && attachment.url) {
			let host = "";
			try { host = new URL(attachment.url).hostname; } catch { /* invalid URL */ }
			if (host !== "api.qrserver.com") return makeResponse(400, { error: "Assistant attachment could not be verified." });
			attachments.push({
				id: String(attachment.id || messageId).slice(0, 80),
				kind: "image",
				name: String(attachment.name || "Resort information").slice(0, 100),
				mimeType: attachment.mimeType,
				url: attachment.url,
			});
		} else {
			return makeResponse(400, { error: "Attachment could not be verified." });
		}
	}

	if (isAssistant) {
		const sourceMessageId = String(body?.sourceMessageId || "");
		if (!clientRole || !sourceMessageId) return makeResponse(403, { error: "Assistant reply could not be verified." });
		const { data: source, error } = await serviceClient
			.from("chat_messages")
			.select("id")
			.eq("id", sourceMessageId)
			.eq("conversation_key", user.id)
			.eq("sender_id", user.id)
			.eq("sender_role", "client")
			.maybeSingle();
		if (error || !source) return makeResponse(403, { error: "Assistant reply could not be verified." });
	}

	if (!text.trim() && attachments.length === 0) return makeResponse(400, { error: "Write a message before sending." });
	let context = "";
	if (!isAssistant) {
		try {
			context = await getRecentContext(serviceClient, conversationKey);
		} catch (error) {
			console.error("Unable to read chat context for moderation:", error?.code || "no code", error?.message || error);
			return makeResponse(503, { error: "Chat moderation is temporarily unavailable. Please try again shortly." });
		}
	}
	const moderationRole = clientRole ? "client" : staffRole;
	let moderation = isAssistant
		? moderateAssistantText(text)
		: text.trim()
			? moderateChatText(text, { context, role: moderationRole })
			: { allowed: true };
	if (isAssistant && !moderation.allowed) {
		text = SAFE_ASSISTANT_REPLY;
		moderation = moderateAssistantText(text);
	}
	if (!moderation.allowed) return makeResponse(400, { error: moderation.message || "Message could not be verified; please try again.", reason: moderation.reason });
	if (!isAssistant && text.trim()) {
		moderation = await classifyChatMessage({
			text,
			context,
			role: moderationRole,
			apiKey: process.env.GROQ_API_KEY,
		});
		if (!moderation.allowed) {
			if (moderation.unavailable && !moderation.fallback) {
				console.error("Chat message rejected because Groq moderation is unavailable.");
				return makeResponse(503, {
					error: moderation.user_message || "We couldn't verify your message right now. Please try again shortly.",
				});
			} else {
				return makeResponse(400, {
					error: moderation.user_message || "We couldn't verify your message right now. Please try again shortly.",
					reason: moderation.category,
				});
			}
		}
	}

	const senderName = isAssistant
		? "Hacienda Amara Assistant"
		: [profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim() || (clientRole ? "Guest" : profile?.role === "admin" ? "Administrator" : "Staff");
	const row = {
		id: messageId,
		conversation_key: conversationKey,
		sender_id: isAssistant ? "bot" : user.id,
		sender_role: isAssistant ? "bot" : staffRole || "client",
		sender_name: senderName,
		content: encodePayload(text, attachments),
		created_at: new Date().toISOString(),
	};
	const { data: inserted, error: insertError } = await serviceClient
		.from("chat_messages")
		.insert(row)
		.select("*")
		.single();
	if (insertError) {
		console.error("Chat message insert was rejected:", insertError.code || insertError.message);
		return makeResponse(insertError.code === "P0001" ? 429 : 400, {
			error: insertError.message || "Message could not be verified; please try again.",
		});
	}
	return makeResponse(201, { message: inserted });
}
