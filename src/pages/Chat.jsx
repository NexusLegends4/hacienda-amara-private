import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import MainLayout from "../layouts/MainLayout";
import { useNavigate, NavLink } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { supabase } from "../utils/supabase";
import { clearConversationHistory, registerChatClearHandler } from "../utils/chat-history";
import DOMPurify from "dompurify";
import { FiSend, FiTrash2, FiMessageSquare, FiClock, FiCheckCircle } from "react-icons/fi";
import { isPaymentInstructionsQuery, PAYMENT_INSTRUCTIONS, PAYMENT_DETAILS_ONLY } from "../utils/payment-instructions";
import { moderateAssistantText, moderateChatText } from "../utils/chat-moderation";
import { QUICK_REPLY_GROUPS, findFaqByKeywords } from "../utils/chat-faq";
import {
	QUICK_QUESTIONS,
	getQuickActionsForRole,
} from "../utils/chat-quick-actions";
import {
	clearUnread,
	getIdentityKey,
	getUnreadState,
	subscribeUnread,
} from "../utils/chat-unread";
import { playChatTone, requestNotificationPermissionOnce, showDesktopNotification } from "../utils/chat-notifications";

const BROADCAST_CHANNEL = "hacienda-amara-support-room";
const HISTORY_STORAGE_KEY = "hacienda-amara-chat-history-v1";
const CUSTOMER_CONVERSATION_KEY_STORAGE = "hacienda-amara-customer-conversation-key";
const LEGACY_CUSTOMER_CONVERSATION_KEY = "customer";
const ADMIN_AVAILABILITY_KEY = "hacienda-amara-admin-available-v1";
const MEDIA_CONTENT_PREFIX = "__HACIENDA_MEDIA__";
const CHAT_MEDIA_SIGNED_URL_SECONDS = 15 * 60;
const EMPTY_MESSAGES = [];
const CHAT_BACKEND_CONFIGURED = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
let guestSessionRequest = null;

const getOrCreateGuestSession = () => {
	if (guestSessionRequest) return guestSessionRequest;

	guestSessionRequest = (async () => {
		const { data, error: sessionError } = await supabase.auth.getSession();
		if (sessionError) throw sessionError;
		if (data.session) return data.session;

		const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
		if (signInError) throw signInError;
		return signInData.session;
	})();

	return guestSessionRequest.finally(() => {
		guestSessionRequest = null;
	});
};

const getGuestAuthErrorMessage = (authError) => {
	const code = String(authError?.code || "").toLowerCase();
	const message = String(authError?.message || "").toLowerCase();

	if (code === "anonymous_provider_disabled" || message.includes("anonymous sign-ins are disabled")) {
		return "Guest chat needs Anonymous Sign-Ins enabled in Supabase: Authentication → Sign In / Providers → Anonymous Sign-Ins.";
	}
	if (code === "over_request_rate_limit" || message.includes("rate limit")) {
		return "Guest chat sign-in is temporarily rate limited. Wait a minute, then retry.";
	}
	if (message.includes("database error creating anonymous user")) {
		return "Supabase could not create the guest account because a database trigger or constraint failed. Check Supabase Logs → Postgres for the failed auth.users insert and its trigger error.";
	}
	if (message.includes("failed to fetch") || message.includes("network")) {
		return "Guest chat could not reach Supabase. Check your connection and the VITE_SUPABASE_URL setting, then reload.";
	}
	return `Guest chat could not start secure sign-in${authError?.message ? `: ${authError.message}` : ". Please retry."}`;
};
const HACIENDA_AMARA_ADDRESS =
	"B30 L12 Itneg Street Phase 3 Amityville Bgry. San Jose, Rodriguez, Rizal, Philippines, 1860";
const HACIENDA_AMARA_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
	HACIENDA_AMARA_ADDRESS,
)}`;
const HACIENDA_AMARA_FACEBOOK_URL = "https://www.facebook.com/HaciendaAmara/";
const HACIENDA_AMARA_FACEBOOK_QR_IMAGE = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
	HACIENDA_AMARA_FACEBOOK_URL,
)}`;
const HACIENDA_AMARA_LOCATION_QR_IMAGE = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
	HACIENDA_AMARA_MAPS_URL,
)}`;
const BOT_DISPLAY_NAME = "Hacienda Amara Assistant";
// When admin/staff is online the assistant stays quiet so the human can
// answer. If nobody replies within this window the assistant takes over so
// the customer is never left hanging.
const ASSISTANT_FALLBACK_DELAY_MS = 45_000;
const AI_SAFE_FALLBACK = "For current availability, reservation status, and details that need confirmation, please contact authorized Hacienda Amara staff.";
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

const hasClientMessage = (messages = []) =>
	Array.isArray(messages) && messages.some((message) => message?.senderRole === "client");

const getConversationProfileId = (messages = []) => {
	const threadMessages = Array.isArray(messages) ? messages : [];

	const clientMessage = [...threadMessages]
		.reverse()
		.find((message) => message?.senderRole === "client" && message.senderId && !message.senderId.startsWith("customer-"));

	if (clientMessage?.senderId) return clientMessage.senderId;

	const fallback = [...threadMessages]
		.reverse()
		.find((message) => message?.senderId && message.senderId !== "bot" && !message.senderId.startsWith("customer-"));

	return fallback?.senderId || "";
};

const getDisplayName = (profile) => {
	if (!profile) return "Customer";

	const fullName = [profile.firstname, profile.lastname].filter(Boolean).join(" ").trim();
	if (fullName) return fullName;

	return profile.email || "Customer";
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

const getCustomerConversationKey = () => {
	if (typeof window === "undefined") return LEGACY_CUSTOMER_CONVERSATION_KEY;

	const existingKey = localStorage.getItem(CUSTOMER_CONVERSATION_KEY_STORAGE);
	if (existingKey) return existingKey;

	// For anonymous guests, use 'guest' as the conversation key to match database policies
	const conversationKey = 'guest';
	localStorage.setItem(CUSTOMER_CONVERSATION_KEY_STORAGE, conversationKey);
	return conversationKey;
};

const getConversationKey = (profile, session) =>
	profile?.id || session?.user?.id || getCustomerConversationKey();

const getBotReply = (text) => {
	const lowerText = text.toLowerCase().trim();

	if (!lowerText) {
		return {
			content: "Hey! I'm here to help with Hacienda Amara. How can I assist you today?",
			quickReplies: QUICK_REPLY_GROUPS.WELCOME,
		};
	}

	// Check for greetings
	if (["hi", "hello", "hey", "good morning", "good afternoon", "good evening"].some((g) => lowerText.includes(g))) {
		return {
			content: "Hi! How can I help you with Hacienda Amara today?",
			quickReplies: QUICK_REPLY_GROUPS.WELCOME,
		};
	}

	// Search FAQ for keyword match
	const faqMatch = findFaqByKeywords(text);
	if (faqMatch) {
		return {
			content: faqMatch.answer,
			quickReplies: faqMatch.quickReplies,
			attachments: faqMatch.attachments || [],
		};
	}

	// Payment instructions query
	if (isPaymentInstructionsQuery(text)) {
		return {
			content: PAYMENT_DETAILS_ONLY,
			quickReplies: ["View Rates", "Check Availability", "Contact Us"],
		};
	}

	// Default fallback with helpful quick replies
	return {
		content: "Thanks for your message! I can help you with information about Hacienda Amara. Here are some things you can ask about:",
		quickReplies: QUICK_REPLY_GROUPS.GENERAL_HELP,
	};
};

const callAIChat = async (userMessage, accessToken) => {
	try {
		const response = await fetch("/api/ai-chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
			},
			body: JSON.stringify({
				messages: [
					{ role: "user", parts: [{ type: "text", text: userMessage }] },
				],
			}),
		});

		if (!response.ok) {
			return AI_SAFE_FALLBACK;
		}

		const result = await response.json();
		return typeof result.reply === "string" ? result.reply : AI_SAFE_FALLBACK;
	} catch (error) {
		console.error("AI assistant request failed:", error);
		return AI_SAFE_FALLBACK;
	}
};

const isGenericResponse = (text) => {
	const generic = [
		"thanks for your message",
		"how can i help",
		"i don't know",
		"i'm not sure",
		"i cannot",
		"unable to",
		"as an ai",
		"i am an ai",
	];
	const lower = text.toLowerCase();
	return generic.some(g => lower.includes(g));
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

const getAttachmentSource = (attachment) =>
	attachment?.url || attachment?.publicUrl || attachment?.dataUrl || attachment?.previewUrl || "";

const mediaInlineClassName =
	"block max-h-80 w-full rounded-xl bg-slate-950 object-contain";

const mediaViewerClassName = "max-h-[80vh] w-full bg-slate-950 object-contain";

const signedUrlIsFresh = (url) => {
	try {
		const token = new URL(url).searchParams.get("token");
		const payload = token?.split(".")[1];
		if (!payload) return false;
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
		return Number(claims.exp) > Math.floor(Date.now() / 1000) + 600;
	} catch {
		return false;
	}
};

const refreshSignedAttachment = async (attachment) => {
	if (!attachment?.path || !attachment?.bucket || signedUrlIsFresh(attachment.url)) {
		return attachment;
	}

	const { data, error } = await supabase.storage
		.from(attachment.bucket)
		.createSignedUrl(attachment.path, CHAT_MEDIA_SIGNED_URL_SECONDS);
	if (error) throw error;
	return { ...attachment, url: data.signedUrl };
};

const refreshSignedMessage = async (message) => ({
	...message,
	attachments: await Promise.all(
		(message.attachments || []).map(refreshSignedAttachment),
	),
});

const ChatVideo = ({ attachment, source }) => {
	const [loading, setLoading] = useState(true);
	const [failureMessage, setFailureMessage] = useState("");
	const [playbackSource, setPlaybackSource] = useState(source);
	const [renewing, setRenewing] = useState(false);
	const renewedRef = useRef(false);

	useEffect(() => {
		setPlaybackSource(source);
		setLoading(true);
		setFailureMessage("");
		setRenewing(false);
		renewedRef.current = false;
	}, [source, attachment?.path]);

	const getPlaybackFailureMessage = (videoElement) => {
		const errorCode = videoElement?.error?.code;
		const mimeType = attachment?.mimeType || "";
		const formatSupported = !mimeType || videoElement?.canPlayType?.(mimeType) !== "";

		if (!formatSupported || errorCode === 4) {
			return "This browser or device cannot play this video format or codec. Try an MP4 encoded with H.264 video and AAC audio, or a browser-compatible WebM.";
		}
		if (errorCode === 2) {
			return "The video could not load. Check your connection and try again.";
		}
		if (errorCode === 3) {
			return "The video appears to be damaged or uses a codec this device cannot decode.";
		}
		if (errorCode === 1) {
			return "Video playback was interrupted. Press play to try again.";
		}
		return "This video could not be played. It may be corrupted, unavailable, or use an unsupported codec.";
	};

	const handlePlaybackError = async (event) => {
		setLoading(false);
		if (!renewedRef.current && attachment?.path && attachment?.bucket) {
			renewedRef.current = true;
			setRenewing(true);
			try {
				const { data, error } = await supabase.storage
					.from(attachment.bucket)
					.createSignedUrl(attachment.path, CHAT_MEDIA_SIGNED_URL_SECONDS);
				if (error) throw error;
				setPlaybackSource(data.signedUrl);
				setLoading(true);
				return;
			} catch (renewError) {
				console.error("Unable to renew chat video access:", renewError);
			} finally {
				setRenewing(false);
			}
		}
		setFailureMessage(getPlaybackFailureMessage(event.currentTarget));
	};

	if (failureMessage || !playbackSource) {
		return (
			<p role="alert" className="rounded-xl bg-slate-900 p-4 text-sm text-white">
				{failureMessage || "This video could not be played because its source is unavailable."}
			</p>
		);
	}

	return (
		<div>
			{loading && (
				<div role="status" className="flex items-center justify-center gap-2 bg-slate-900 p-3 text-xs text-white">
					<span className="loading loading-spinner loading-sm" /> {renewing ? "Refreshing video access…" : "Loading video…"}
				</div>
			)}
			<video
				controls
				playsInline
				preload="metadata"
				poster={typeof attachment?.poster === "string" && attachment.poster.startsWith("data:image/jpeg;base64,") ? attachment.poster : undefined}
				className="block max-h-[70vh] min-h-40 w-full rounded-xl bg-slate-950 object-contain sm:max-h-[32rem]"
				src={playbackSource}
				onLoadedMetadata={() => setLoading(false)}
				onCanPlay={() => setLoading(false)}
				onError={handlePlaybackError}
			>
				<source src={playbackSource} type={attachment.mimeType || "video/mp4"} />
			</video>
			<p className="sr-only">Video controls include playback, timeline, and volume.</p>
		</div>
	);
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

const ChatConversation = ({ presentation = "page", onClose }) => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const isBubble = presentation === "bubble";
	const isAdmin = profile?.role === "admin";
	const isStaff = profile?.role === "staff";
	const isAdminOrStaff = isAdmin || isStaff;
	const conversationKey = getConversationKey(profile, session);
	const displayName = getDisplayName(profile);
	const display = getUserLabel(profile);

const [adminAvailable, setAdminAvailable] = useState(() => {
		if (typeof window === "undefined" || !isAdminOrStaff) return false;

		const saved = localStorage.getItem(ADMIN_AVAILABILITY_KEY);
		return saved ? saved === "true" : true;
	});
const [adminOnline, setAdminOnline] = useState(false);
const [staffOnline, setStaffOnline] = useState(false);
const [remoteTyping, setRemoteTyping] = useState(null);
const [seenReceipts, setSeenReceipts] = useState({});
const [chatToast, setChatToast] = useState(null);
const [realtimeReady, setRealtimeReady] = useState(false);
const [historyByConversation, setHistoryByConversation] = useState(() => {
		const stored = readHistory();
		return stored;
	});
const [activeConversationKey, setActiveConversationKey] = useState(conversationKey);
const [prompt, setPrompt] = useState("");
	const [selectedMedia, setSelectedMedia] = useState(null);
	const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
	const conversationMenuRef = useRef(null);
const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatAuthReady, setChatAuthReady] = useState(!CHAT_BACKEND_CONFIGURED);
  const [chatAuthError, setChatAuthError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [profilesById, setProfilesById] = useState({});
	const messageListRef = useRef(null);
	const shouldStickToBottomRef = useRef(true);
	const pendingScrollToBottomRef = useRef(true);
	const channelRef = useRef(null);
	const activeConversationKeyRef = useRef(activeConversationKey);
	activeConversationKeyRef.current = activeConversationKey;
	const localTypingRef = useRef({ lastSentAt: 0, stopTimer: null });
	const remoteTypingTimerRef = useRef(null);
	const remoteTypingSenderRef = useRef(null);
	const dbAvailableRef = useRef(true);
	const isRefreshingHistoryRef = useRef(false);
	const pendingBotReplyTimersRef = useRef(new Set());
	const pendingAssistantFallbackRef = useRef(null);
	const lastClientMessageAtRef = useRef(0);
	const pendingWritesRef = useRef(new Set());
	const chatGenerationRef = useRef(0);
	const messageTimestampsRef = useRef([]);
	const isClearingChatRef = useRef(false);
	const clearedConversationsRef = useRef(new Set());

	const clearAssistantFallback = useCallback(() => {
		if (pendingAssistantFallbackRef.current) {
			window.clearTimeout(pendingAssistantFallbackRef.current);
			pendingAssistantFallbackRef.current = null;
		}
	}, []);

	// Close the conversation switcher when clicking anywhere else.
	useEffect(() => {
		if (!conversationMenuOpen) return undefined;
		const handlePointerDown = (event) => {
			if (conversationMenuRef.current && !conversationMenuRef.current.contains(event.target)) {
				setConversationMenuOpen(false);
			}
		};
		const handleKeyDown = (event) => {
			if (event.key === "Escape") setConversationMenuOpen(false);
		};
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [conversationMenuOpen]);

	const sendChatBroadcast = useCallback((event, payload) => {
		const channel = channelRef.current;
		if (!channel || !realtimeReady) return;
		void channel.send({ type: "broadcast", event, payload });
	}, [realtimeReady]);

	const sendTypingState = (typing) => {
		const targetConversationKey = isAdminOrStaff
			? activeConversationKeyRef.current
			: conversationKey;
		if (!targetConversationKey || !session?.user?.id) return;
		sendChatBroadcast("chat_typing", {
			conversationKey: targetConversationKey,
			senderId: session.user.id,
			senderRole: isAdmin ? "admin" : isStaff ? "staff" : "client",
			senderName: displayName,
			typing,
		});
	};

	const handlePromptChange = (event) => {
		const value = event.target.value;
		setPrompt(value);
		if (!session?.user?.id || !realtimeReady) return;

		const typingRef = localTypingRef.current;
		if (!value.trim()) {
			if (typingRef.stopTimer) window.clearTimeout(typingRef.stopTimer);
			typingRef.stopTimer = null;
			sendTypingState(false);
			return;
		}

		if (Date.now() - typingRef.lastSentAt > 900) {
			sendTypingState(true);
			typingRef.lastSentAt = Date.now();
		}
		if (typingRef.stopTimer) window.clearTimeout(typingRef.stopTimer);
		typingRef.stopTimer = window.setTimeout(() => {
			sendTypingState(false);
			typingRef.stopTimer = null;
		}, 1800);
	};

	useEffect(() => {
		if (!CHAT_BACKEND_CONFIGURED || session) {
			setChatAuthReady(true);
			return undefined;
		}

		let cancelled = false;
		setChatAuthReady(false);
		const ensureGuestSession = async () => {
			try {
				await getOrCreateGuestSession();
				if (!cancelled) setChatAuthError("");
			} catch (authError) {
				console.error("Unable to start secure guest chat:", authError);
				if (!cancelled) {
					const authMessage = getGuestAuthErrorMessage(authError);
					setChatAuthError(authMessage);
					setError(authMessage);
					setChatAuthReady(true);
				}
			} finally {
				if (!cancelled) setChatAuthReady(true);
			}
		};

		void ensureGuestSession();
		return () => {
			cancelled = true;
		};
	}, [session]);

	const activeMessages = historyByConversation[activeConversationKey] || EMPTY_MESSAGES;
	const activeThreadName =
		activeMessages.slice().reverse().find((message) => message.senderName)?.senderName ||
		(isAdminOrStaff ? "Customer" : displayName);
	const activeMessagesProfiles = useMemo(() => {
		const ids = new Set();
		for (const message of activeMessages) {
			if (message?.senderId && message.senderId !== "bot" && message.senderId !== "guest") {
				ids.add(message.senderId);
			}
		}

		return [...ids];
	}, [activeMessages]);
	const quickActions = useMemo(() => getQuickActionsForRole(profile?.role), [profile?.role]);

	const conversations = useMemo(() => {
		if (!isAdminOrStaff) {
			return [
				{
					key: conversationKey,
					lastMessage: activeMessages[activeMessages.length - 1] || null,
				},
			];
		}

		return Object.entries(historyByConversation)
			.filter(([key]) => key !== LEGACY_CUSTOMER_CONVERSATION_KEY)
			.map(([key, messages]) => ({
				key,
				lastMessage: messages[messages.length - 1] || null,
			}))
			.sort((a, b) => {
				const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
				const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
				return bTime - aTime;
			});
	}, [activeMessages, conversationKey, historyByConversation, isAdminOrStaff]);

	const sidebarProfiles = useMemo(() => {
		if (!isAdminOrStaff) return [];

		const ids = new Set();
		Object.values(historyByConversation).forEach((messages) => {
			const profileId = getConversationProfileId(messages);
			if (profileId) ids.add(profileId);
		});

return [...ids];
	}, [historyByConversation, isAdminOrStaff]);

const canReply = !isAdminOrStaff || (adminAvailable && hasClientMessage(activeMessages));

	// ---- Chat notifications -------------------------------------------------
	// Guests and clients are told when staff answers them, and staff are told
	// when a new client message lands in a conversation they are not looking at.
	const unreadIdentity = getIdentityKey(
		isAdminOrStaff ? (isAdmin ? "admin" : "staff") : "client",
		session?.user?.id || profile?.id || "anonymous",
	);
	const unreadCounts = useSyncExternalStore(
		useCallback((callback) => subscribeUnread(callback), []),
		useCallback(() => getUnreadState(unreadIdentity), [unreadIdentity]),
	);

	const isConversationVisible = useCallback(
		(conversationKeyToCheck) => {
			if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
			if (typeof window !== "undefined" && !window.focused) return false;
			if (isAdminOrStaff) return conversationKeyToCheck === activeConversationKeyRef.current;
			return conversationKeyToCheck === conversationKey;
		},
		[conversationKey, isAdminOrStaff],
	);

	const markConversationRead = useCallback(
		(conversationKeyToClear) => {
			clearUnread(unreadIdentity, conversationKeyToClear);
		},
		[unreadIdentity],
	);

		const handleIncomingNotification = useCallback(
			(message) => {
				if (!message?.conversationKey) return;
				const isFromStaff = message.senderRole === "admin" || message.senderRole === "staff";
				const isFromClient = message.senderRole === "client";
				if (!isFromStaff && !isFromClient) return;
				// Staff do not notify themselves, and clients ignore their own echo.
				if (isAdminOrStaff && !isFromClient) return;
				if (!isAdminOrStaff && !isFromStaff) return;

				if (isAdminOrStaff) {
					// Staff/desktop-only notifications: a new customer message.
					markConversationRead(message.conversationKey);
					playChatTone("incoming");
					const senderName = message.senderName || "Customer";
					const preview = (getMessageText(message) || "New message").slice(0, 90);
					const title = `New chat from ${senderName}`;
					setChatToast({ id: message.id, title, preview, conversationKey: message.conversationKey });
					window.setTimeout(() => {
						setChatToast((current) => (current?.id === message.id ? null : current));
					}, 6000);
					showDesktopNotification(title, preview);
					return;
				}
				// Client side: the floating bubble's poller handles notifications
				// when closed. When open, just mark the message read and play a tone.
				markConversationRead(message.conversationKey);
				playChatTone("incoming");
			},
			[isAdminOrStaff, markConversationRead],
		);

	// Mark the active conversation as read while the window is focused.
	useEffect(() => {
		if (isAdminOrStaff) {
			// Staff get desktop notifications for new customer messages.
			requestNotificationPermissionOnce();
			if (!activeConversationKey) return undefined;
			markConversationRead(activeConversationKey);
			return undefined;
		}
		if (!conversationKey) return undefined;
		if (!isConversationVisible(conversationKey)) return undefined;
		markConversationRead(conversationKey);
		return undefined;
	}, [activeConversationKey, conversationKey, isAdminOrStaff, isConversationVisible, markConversationRead, activeMessages.length]);

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
		const persistedHistory = Object.fromEntries(
			Object.entries(historyByConversation).filter(([key]) => !clearedConversationsRef.current.has(key)),
		);
		writeHistory(persistedHistory);
	}, [historyByConversation]);

	useEffect(() => registerChatClearHandler(async (targetConversationKey) => {
		if (targetConversationKey !== conversationKey) return undefined;

		isClearingChatRef.current = true;
		chatGenerationRef.current += 1;
		clearedConversationsRef.current.add(targetConversationKey);
		pendingBotReplyTimersRef.current.forEach((timer) => window.clearTimeout(timer));
		pendingBotReplyTimersRef.current.clear();
		clearAssistantFallback();
		await Promise.allSettled([...pendingWritesRef.current]);
		setHistoryByConversation((current) => {
			const next = { ...current };
			delete next[targetConversationKey];
			return next;
		});

		return () => {
			isClearingChatRef.current = false;
		};
	}), [conversationKey, clearAssistantFallback]);

	const mergeMessage = useCallback((message) => {
		clearedConversationsRef.current.delete(message.conversationKey);
		setHistoryByConversation((current) => {
			return upsertConversationHistory(current, message);
		});
	}, []);

	const persistMessage = useCallback(async (message, sourceMessageId = "", accessTokenOverride = "") => {
		if (isClearingChatRef.current && message.conversationKey === conversationKey) {
			throw new Error("This chat is being cleared.");
		}
		if (!CHAT_BACKEND_CONFIGURED) return;
		if (!dbAvailableRef.current) {
			throw new Error("Chat history storage is unavailable. Please try again later.");
		}

		const pendingWrite = (async () => {
			const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
			let accessToken = currentSession?.session?.access_token || accessTokenOverride || session?.access_token;
			if (sessionError || !accessToken) throw new Error("Secure chat sign-in is required. Please reload and try again.");
			const requestBody = JSON.stringify({ message: toDbPayload(message), ...(sourceMessageId ? { sourceMessageId } : {}) });
			const sendRequest = (token) => fetch("/api/chat-message", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: requestBody,
			});
			let response = await sendRequest(accessToken);
			if (response.status === 401) {
				const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
				if (refreshError || !refreshed?.session?.access_token) {
					throw new Error("Your secure chat sign-in expired. Reload the page and sign in again.");
				}
				accessToken = refreshed.session.access_token;
				response = await sendRequest(accessToken);
			}
			const responseBody = await response.text();
			let result;
			try {
				result = JSON.parse(responseBody);
			} catch {
				console.error("Chat API returned a non-JSON response:", response.status, response.headers.get("content-type"));
				throw new Error("Chat service is unavailable. Restart the local server or try again after deployment.");
			}
			if (!response.ok) {
				throw new Error(result?.error || "Message could not be verified; please try again.");
			}
		})();
		pendingWritesRef.current.add(pendingWrite);
		try {
			await pendingWrite;
		} finally {
			pendingWritesRef.current.delete(pendingWrite);
		}
	}, [conversationKey, session]);

	const refreshFromDb = useCallback(async () => {
		if (!CHAT_BACKEND_CONFIGURED) return false;
		if (!dbAvailableRef.current) return false;
		if (isClearingChatRef.current) return false;
		const chatGeneration = chatGenerationRef.current;
		isRefreshingHistoryRef.current = true;

		try {
			let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
			if (!isAdminOrStaff) {
				query = query.eq("conversation_key", conversationKey);
			}

			const { data, error: dbError } = await query;
			if (dbError) {
				const text = `${dbError.message || ""} ${dbError.details || ""}`.toLowerCase();
				if (text.includes("does not exist") || text.includes("relation")) {
					dbAvailableRef.current = false;
				}
				setError("Chat history could not be loaded. Please refresh and try again.");

				return false;
			}

			const grouped = {};
			const hydratedMessages = await Promise.all(
				(data || []).map((row) => refreshSignedMessage(normalizeDbMessage(row))),
			);
			if (chatGeneration !== chatGenerationRef.current || isClearingChatRef.current) return false;

			hydratedMessages.forEach((message) => {
				grouped[message.conversationKey] = grouped[message.conversationKey] || [];
				const hasMessage = grouped[message.conversationKey].some((item) => item.id === message.id);
				if (!hasMessage) {
					grouped[message.conversationKey].push(message);
				}
			});

const nextSnapshot = isAdminOrStaff
			? Object.fromEntries(
					Object.entries(grouped).filter(
						([key, messages]) => key !== LEGACY_CUSTOMER_CONVERSATION_KEY && hasClientMessage(messages),
					),
			  )
			: {
					[conversationKey]: grouped[conversationKey] || [],
			  };

		const nextIsEmpty = isAdminOrStaff
			? Object.keys(nextSnapshot).length === 0
			: (nextSnapshot[conversationKey] || []).length === 0;

		if (!isAdminOrStaff && nextIsEmpty && !clearedConversationsRef.current.has(conversationKey)) {
			const stored = readHistory();
			const storedIsEmpty = (stored[conversationKey] || []).length === 0;

			if (!storedIsEmpty) return stored;
		}

		setHistoryByConversation(nextSnapshot);
		if (isAdminOrStaff) {
			const validConversationKeys = Object.keys(nextSnapshot);
			if (!validConversationKeys.includes(activeConversationKeyRef.current)) {
				setActiveConversationKey(validConversationKeys[0] || conversationKey);
			}
		}

		return nextSnapshot;
		} catch (historyError) {
			console.error("Unable to refresh chat history or media access:", historyError);
			setError("Chat history or media could not be loaded securely. Please refresh and try again.");
			return false;
		} finally {
			isRefreshingHistoryRef.current = false;
		}
	}, [conversationKey, isAdminOrStaff]);

	useEffect(() => {
		const profileIds = new Set([...activeMessagesProfiles, ...sidebarProfiles]);
		if (profile?.id) {
			profileIds.add(profile.id);
		}

		if (profileIds.size === 0) return undefined;

		let cancelled = false;
		const loadProfiles = async () => {
			const ids = [...profileIds];
			// Read the display-only view so guests and customers can also see
			// the name and picture of the staff member they are talking to.
			// Fall back to the profiles table if the view is not available yet.
			let query = supabase
				.from("chat_participant_profiles")
				.select("id, firstname, lastname, avatar_url, role")
				.in("id", ids);
			let { data, error: dbError } = await query;
			if (dbError) {
				const fallback = await supabase
					.from("profiles")
					.select("id, firstname, lastname, avatar_url, email, role")
					.in("id", ids);
				if (fallback.error) {
					if (!cancelled) console.error("Unable to load chat participant profiles:", fallback.error.message);
					return;
				}
				data = fallback.data;
			}

			if (cancelled || !Array.isArray(data)) return;

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
		if (isClearingChatRef.current) return;
		setIsRefreshing(true);

		try {
			let refreshed = null;

			if (CHAT_BACKEND_CONFIGURED) {
				dbAvailableRef.current = true;
				refreshed = await refreshFromDb();
			}

			if (!refreshed) {
				if (isAdminOrStaff) {
					setHistoryByConversation({});
					setActiveConversationKey("");
					setError("Saved customer conversations could not be loaded. Refresh before replying.");
				} else {
					const stored = readHistory();
					setHistoryByConversation({ [conversationKey]: stored[conversationKey] || [] });
				}
			} else {
				setHistoryByConversation(refreshed);
			}

			if (refreshed || !isAdminOrStaff) setError("");
			pendingScrollToBottomRef.current = true;
			shouldStickToBottomRef.current = true;

			requestAnimationFrame(() => {
				const container = messageListRef.current;

				if (container) {
					container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
				}
			});
} finally {
            setIsRefreshing(false);
            setShowRefreshToast(true);
            setTimeout(() => setShowRefreshToast(false), 2000);
        }
    };

const clearCurrentChat = async () => {
    setShowClearConfirm(true);
  };

  const confirmClearChat = async () => {
    setShowClearConfirm(false);

    const targetConversationKey = isAdminOrStaff ? activeConversationKey : conversationKey;

	try {
      if (CHAT_BACKEND_CONFIGURED && dbAvailableRef.current) {
		await clearConversationHistory(targetConversationKey);
      }

	  clearedConversationsRef.current.add(targetConversationKey);
      setHistoryByConversation((current) => {
        const next = { ...current };
        delete next[targetConversationKey];
      return next;
    });

    setPrompt("");
	} catch (deleteError) {
		console.error("Unable to clear saved chat history:", deleteError);
		setError("Chat history could not be cleared. Please try again.");
	}
  };

  const cancelClearChat = () => {
    setShowClearConfirm(false);
  };

	useEffect(() => {
		if (!chatAuthReady) return undefined;
		setLoading(true);
		setError("");
		pendingScrollToBottomRef.current = true;

		const initialize = async () => {
			if (profile || session) {
				const loaded = await refreshFromDb();
				if (!loaded) {
					if (isAdminOrStaff) {
						setHistoryByConversation({});
						setActiveConversationKey("");
					} else {
						const stored = readHistory();
						setHistoryByConversation({ [conversationKey]: stored[conversationKey] || [] });
					}
				}
			} else {
				// Clear chat history for guests on page refresh
				const stored = readHistory();
				if (stored[conversationKey] && stored[conversationKey].length > 0) {
					// Clear guest chat history on page refresh
					const newHistory = { ...stored };
					newHistory[conversationKey] = [];
					writeHistory(newHistory);
					setHistoryByConversation(newHistory);
				} else {
					setHistoryByConversation(stored);
				}
			}

			if (!isAdminOrStaff) {
				setActiveConversationKey(conversationKey);
			}

			setLoading(false);
		};

		void initialize();
		return () => {
			setLoading(true);
		};
	}, [chatAuthReady, conversationKey, isAdminOrStaff, profile, refreshFromDb, session]);

	useEffect(() => {
		pendingScrollToBottomRef.current = true;
		shouldStickToBottomRef.current = true;
	}, [activeConversationKey]);

	useEffect(() => {
		if (!isAdminOrStaff) return;

		const keys = Object.keys(historyByConversation);
		if (keys.length === 0) return;
		if (historyByConversation[activeConversationKey]) return;

		setActiveConversationKey(keys[0]);
	}, [activeConversationKey, historyByConversation, isAdminOrStaff]);

	useEffect(() => {
		if (!session) return undefined;

		const interval = window.setInterval(() => {
			refreshFromDb();
		}, 4000);

		return () => {
			window.clearInterval(interval);
		};
	}, [conversationKey, isAdminOrStaff, refreshFromDb, session]);

	useEffect(() => {
		if (!session || typeof window === "undefined") return undefined;

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
	}, [refreshFromDb, session]);

	useEffect(() => {
		if (!session) return undefined;

		const channel = supabase.channel(BROADCAST_CHANNEL);
		channelRef.current = channel;
		const typingState = localTypingRef.current;

		const applyPresence = () => {
			const state = channel.presenceState();
			const entries = Object.values(state).flat();
			const hasAdmin = entries.some((entry) => entry.role === "admin" && entry.available);
			const hasStaff = entries.some((entry) => entry.role === "staff" && entry.available);
			setAdminOnline(hasAdmin);
			setStaffOnline(hasStaff);
		};

		channel.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "chat_messages",
			},
			({ new: row }) => {
				if (!row?.id || !row.conversation_key) return;
				if (isRefreshingHistoryRef.current) return;

				console.log("📥 Postgres INSERT:", row.conversation_key, row.sender_role, row.sender_name);
				const message = normalizeDbMessage(row);
				setHistoryByConversation((current) => {
					const existing = current[message.conversationKey] || [];
					if (existing.some((item) => item.id === message.id)) {
						return current;
					}

					return upsertConversationHistory(current, message);
				});

				if (!isAdminOrStaff && message.conversationKey === conversationKey) {
					setActiveConversationKey(conversationKey);
				}

				handleIncomingNotification(message);
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

				if (!isAdminOrStaff && targetConversationKey === conversationKey) {
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
		channel.on("broadcast", { event: "chat_typing" }, ({ payload }) => {
			if (!payload?.conversationKey || payload.senderId === session.user.id) return;
			const visibleConversationKey = isAdminOrStaff
				? activeConversationKeyRef.current
				: conversationKey;
			if (payload.conversationKey !== visibleConversationKey) return;

			if (!payload.typing) {
				if (remoteTypingSenderRef.current === payload.senderId) {
					setRemoteTyping(null);
					remoteTypingSenderRef.current = null;
					if (remoteTypingTimerRef.current) window.clearTimeout(remoteTypingTimerRef.current);
				}
				return;
			}

			remoteTypingSenderRef.current = payload.senderId;
			setRemoteTyping({
				senderId: payload.senderId,
				name: payload.senderName || (payload.senderRole === "client" ? "Customer" : "Support"),
				role: payload.senderRole,
			});
			if (remoteTypingTimerRef.current) window.clearTimeout(remoteTypingTimerRef.current);
			remoteTypingTimerRef.current = window.setTimeout(() => {
				setRemoteTyping(null);
				remoteTypingSenderRef.current = null;
			}, 3000);
		});
		channel.on("broadcast", { event: "chat_seen" }, ({ payload }) => {
			if (!payload?.conversationKey || !payload.messageId || payload.senderId === session.user.id) return;
			setSeenReceipts((current) => ({
				...current,
				[payload.conversationKey]: payload.messageId,
			}));
		});

		channel.subscribe(async (status) => {
			if (status !== "SUBSCRIBED") return;
			setRealtimeReady(true);

			if (isAdminOrStaff) {
				if (adminAvailable) {
					await channel.track({
						role: isAdmin ? "admin" : "staff",
						available: true,
						name: displayName,
						profileId: session.user.id,
					});
				}
			} else {
				await channel.track({
					role: "client",
					available: true,
					name: displayName,
				});
			}
		});

		return () => {
			setRealtimeReady(false);
			if (typingState.stopTimer) {
				window.clearTimeout(typingState.stopTimer);
				typingState.stopTimer = null;
			}
			if (remoteTypingTimerRef.current) {
				window.clearTimeout(remoteTypingTimerRef.current);
				remoteTypingTimerRef.current = null;
			}
			remoteTypingSenderRef.current = null;
			channel.unsubscribe();
			channelRef.current = null;
		};
	}, [adminAvailable, conversationKey, displayName, handleIncomingNotification, isAdmin, isAdminOrStaff, profile, session]);

	useEffect(() => {
		if (!isAdminOrStaff) return;

		if (typeof window !== "undefined") {
			localStorage.setItem(ADMIN_AVAILABILITY_KEY, String(adminAvailable));
		}

		const channel = channelRef.current;
		if (!channel) return;

		(async () => {
			try {
				if (adminAvailable) {
					await channel.track({
						role: isAdmin ? "admin" : "staff",
						available: true,
						name: displayName,
						profileId: session?.user?.id,
					});
				} else {
					await channel.untrack();
				}
			} catch {
				// The chat still works even if presence tracking is temporarily unavailable.
			}
		})();
	}, [adminAvailable, displayName, isAdmin, isAdminOrStaff, profile, session]);

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
		senderRole = isAdminOrStaff ? (isAdmin ? "admin" : "staff") : "client",
	) => {
		const messageId = getMessageId();
		const activeSession = CHAT_BACKEND_CONFIGURED
			? (await supabase.auth.getSession()).data.session || session
			: session;
		if (CHAT_BACKEND_CONFIGURED && !activeSession?.user?.id) {
			throw new Error("Secure chat sign-in is required. Please reload and try again.");
		}
		const targetConversationKey = isAdminOrStaff
			? activeConversationKey
			: activeSession?.user?.id || conversationKey;
		if (!isAdminOrStaff && targetConversationKey !== activeConversationKey) {
			setActiveConversationKey(targetConversationKey);
		}
		const message = {
			id: messageId,
			conversationKey: targetConversationKey,
			senderId: activeSession?.user?.id || profile?.id || "guest",
			senderRole,
			senderName: displayName,
			content,
			attachments: [],
			createdAt: new Date().toISOString(),
		};

		await persistMessage(message);
		mergeMessage(message);

		return { ...message, accessToken: activeSession?.access_token || "" };
	};

	const handleSubmit = async (event) => {
		event?.preventDefault?.();
		await sendChatText(prompt);
	};
	// When admin/staff answers the customer, the pending assistant fallback is
	// no longer needed and the assistant must stay quiet.
	useEffect(() => {
		if (isAdminOrStaff) return;
		if (!pendingAssistantFallbackRef.current) return;
		const sentAt = lastClientMessageAtRef.current;
		if (!sentAt) return;
		const answeredByStaff = activeMessages.some((message) => {
			if (message?.senderRole !== "admin" && message?.senderRole !== "staff") return false;
			const createdAt = new Date(message.createdAt || 0).getTime();
			return createdAt >= sentAt;
		});
		if (answeredByStaff) clearAssistantFallback();
	}, [activeMessages, isAdminOrStaff, clearAssistantFallback]);

	const runAssistantReply = useCallback(async (question, outgoing, chatGeneration) => {
		let replyText = "";
		let replyAttachments = [];
		let replyQuickReplies = [];

		if (isPaymentInstructionsQuery(question)) {
			// For payment queries, show only manual transfer details
			replyText = PAYMENT_DETAILS_ONLY;
		} else {
			// Check FAQ keywords first for instant accurate responses
			const botReply = getBotReply(question);
			const hasFaqMatch = typeof botReply === "string"
				? !botReply.includes("Thanks for your message. If you need more help")
				: (botReply.content && !botReply.content.includes("Thanks for your message. If you need more help"));

			if (hasFaqMatch) {
				// FAQ keyword matched - use rule-based response
				replyText = typeof botReply === "string" ? botReply : botReply.content || "";
				replyAttachments = typeof botReply === "string" ? [] : botReply.attachments || [];
				replyQuickReplies = typeof botReply === "string" ? [] : botReply.quickReplies || [];
			} else {
				// No FAQ match - try AI for open-ended questions
				const currentSession = session || (await supabase.auth.getSession()).data.session;
				const aiReply = await callAIChat(
					question,
					currentSession?.access_token || outgoing.accessToken,
				);
				if (!aiReply || isGenericResponse(aiReply)) {
					replyText = typeof botReply === "string" ? botReply : botReply.content || "";
					replyAttachments = typeof botReply === "string" ? [] : botReply.attachments || [];
					replyQuickReplies = typeof botReply === "string" ? [] : botReply.quickReplies || [];
				} else {
					replyText = aiReply;
				}
			}
		}
		if (!moderateAssistantText(replyText).allowed) {
			replyText = "For details I can’t verify here, please contact authorized Hacienda Amara staff.";
		}

		if (chatGeneration !== chatGenerationRef.current || isClearingChatRef.current) return;

		const botMessage = {
			id: getMessageId(),
			conversationKey: outgoing.conversationKey,
			senderId: "bot",
			senderRole: "bot",
			senderName: BOT_DISPLAY_NAME,
			content: replyText,
			attachments: replyAttachments,
			quickReplies: replyQuickReplies,
			createdAt: new Date().toISOString(),
		};

		const botReplyTimer = window.setTimeout(async () => {
			pendingBotReplyTimersRef.current.delete(botReplyTimer);
			if (chatGeneration !== chatGenerationRef.current || isClearingChatRef.current) return;

			pendingScrollToBottomRef.current = true;
			mergeMessage(botMessage);
			try {
				await persistMessage(botMessage, outgoing.id, outgoing.accessToken);
			} catch (botError) {
				console.error("Unable to save the chat assistant reply:", botError);
				setError(`The bot replied, but its reply could not be saved to chat history: ${botError?.message || "Please try again."}`);
			}
		}, 650);
		pendingBotReplyTimersRef.current.add(botReplyTimer);
	}, [isClearingChatRef, mergeMessage, persistMessage, session]);

	const sendChatText = async (rawText) => {
		const trimmed = DOMPurify.sanitize(String(rawText || "").trim());
		if (trimmed) {
			const moderation = moderateChatText(trimmed, {
				context: activeMessages.slice(-4).map(getMessageText).join(" ").slice(-2400),
				role: isAdminOrStaff ? (isAdmin ? "admin" : "staff") : "client",
			});
			if (!moderation.allowed) {
				setError(moderation.message);
				return;
			}
		}
		
		if (!trimmed) return;
		if (loading || isSending) return;
		const now = Date.now();
		messageTimestampsRef.current = messageTimestampsRef.current.filter((timestamp) => now - timestamp < 60_000);
		if (messageTimestampsRef.current.length >= 10) {
			setError("Message limit reached. Please wait a minute before sending more messages.");
			return;
		}
		if (chatAuthError) {
			setError(chatAuthError);
			return;
		}
		if (!chatAuthReady) {
			setError("Chat is still connecting securely. Please wait a moment and try again.");
			return;
		}
		if (isAdminOrStaff && !canReply) return;

		setError("");
		setIsSending(true);
		pendingScrollToBottomRef.current = true;
		shouldStickToBottomRef.current = true;
		const chatGeneration = chatGenerationRef.current;

		try {
			const outgoing = await sendMessage(trimmed, isAdminOrStaff ? (isAdmin ? "admin" : "staff") : "client");
			if (chatGeneration !== chatGenerationRef.current || isClearingChatRef.current) return;
			if (localTypingRef.current.stopTimer) {
				window.clearTimeout(localTypingRef.current.stopTimer);
				localTypingRef.current.stopTimer = null;
			}
			sendTypingState(false);
			setPrompt("");

			// While admin/staff is online the human takes over and the assistant
			// stays quiet. If nobody answers, the assistant replies after a
			// short grace period so the customer is never left waiting.
			const staffIsOnline = adminOnline || staffOnline;
			const shouldTriggerBot = !isAdminOrStaff && !staffIsOnline;

			if (!isAdminOrStaff && staffIsOnline) {
				lastClientMessageAtRef.current = Date.now();
				clearAssistantFallback();
				pendingAssistantFallbackRef.current = window.setTimeout(() => {
					pendingAssistantFallbackRef.current = null;
					void runAssistantReply(trimmed, outgoing, chatGeneration);
				}, ASSISTANT_FALLBACK_DELAY_MS);
			} else if (shouldTriggerBot) {
				await runAssistantReply(trimmed, outgoing, chatGeneration);
			}
		} catch (sendError) {
			console.error("Unable to send chat message:", sendError);
			setError(sendError?.message || "Unable to send your message. Please try again.");
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

	const renderMessage = (message, messageIndex = 0) => {
		const isOutgoing = isAdminOrStaff
			? message.senderRole === (isAdmin ? "admin" : "staff")
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
				? "rounded-bl-lg rounded-tr-lg rounded-br-lg border border-[#ead9c2] bg-[#fdf6ec] text-[#3b2a1a] shadow-[0_6px_18px_rgba(138,94,52,0.08)]"
				: "rounded-bl-lg rounded-tr-lg rounded-br-lg border border-[#ead9c2] bg-[#fffdf8] text-[#3b2a1a] shadow-[0_6px_18px_rgba(138,94,52,0.08)]";
		const messageToneClassName = isRightAligned ? "text-[#fff7eb]" : "text-[#3b2a1a]";
		const wasSeen = seenReceipts[message.conversationKey] === message.id;
		const footerText = attachmentSummary || (isRightAligned ? wasSeen ? "Seen" : "Delivered" : "");

		// Quick replies: use the ones attached to the message, or derive them
		// from the client question that triggered this bot reply so the buttons
		// still show up after the conversation is reloaded from the database.
		let messageQuickReplies = Array.isArray(message.quickReplies) ? message.quickReplies : [];
		if (isBotMessage && messageQuickReplies.length === 0) {
			const thread = isAdminOrStaff
				? activeMessages
				: historyByConversation[conversationKey] || EMPTY_MESSAGES;
			const previousClientMessage = [...thread.slice(0, messageIndex)]
				.reverse()
				.find((item) => item?.senderRole === "client");
			if (previousClientMessage) {
				const derived = getBotReply(previousClientMessage.content);
				messageQuickReplies = Array.isArray(derived?.quickReplies) ? derived.quickReplies : [];
			}
		}

		return (
			<div
				key={message.id}
				className={`chat ${isRightAligned ? "chat-end" : "chat-start"} ${isRightAligned ? "justify-end" : "justify-start"}`}
			>
				<div className="chat-image avatar">
					<div className="w-8 overflow-hidden rounded-full border border-[#ead9c2] bg-[#9a6a39] text-[0.65rem] font-bold text-white shadow-sm">
						{avatarUrl ? (
							<img
								src={avatarUrl}
								alt={senderDisplayName}
								className="h-8 w-8 object-cover"
							/>
						) : (
							<div className="flex h-8 w-8 items-center justify-center">
								{avatarLabel}
							</div>
						)}
					</div>
				</div>

				<div className={`chat-header flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] ${isRightAligned ? "justify-end text-right" : "justify-start text-left"} ${messageToneClassName}`}>
					<span className={`font-semibold ${isRightAligned ? "text-[#9a6a39]" : "text-[#8b5e34]"}`}>
						{senderDisplayName}
					</span>
					{message.senderRole === "bot" && (
						<span className="ml-1.5 text-[0.55rem] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
							Bot
						</span>
					)}
					{message.senderRole === "admin" && (
						<span className="ml-1.5 text-[0.55rem] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
							Admin
						</span>
					)}
					{message.senderRole === "staff" && (
						<span className="ml-1.5 text-[0.55rem] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
							Staff
						</span>
					)}
					{time && (
						<time className="text-xs normal-case tracking-normal opacity-50">
							{time}
						</time>
					)}
				</div>

				<div className={`chat-bubble ${bubbleToneClassName} max-w-[88%] px-3 py-2 text-sm leading-5 ${messageToneClassName}`}>
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
										<ChatVideo attachment={attachment} source={getAttachmentSource(attachment)} />
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
					{isBotMessage && messageQuickReplies.length > 0 && (
						<div className="mt-2.5 border-t border-[#ead9c2] pt-2">
							<p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[#8b5e34]/60">
								You can also ask
							</p>
							<div className="flex flex-wrap gap-1.5">
								{messageQuickReplies.map((qr, idx) => (
									<button
										key={`qr-${message.id}-${idx}`}
										type="button"
										onClick={() => sendChatText(qr)}
										className="rounded-full border border-[#9a6a39]/40 bg-white px-2.5 py-1.5 text-[0.68rem] font-medium text-[#8b5e34] hover:bg-[#8b5e34] hover:text-white transition shrink-0"
									>
										{qr}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				<div className={`chat-footer text-[0.68rem] ${isRightAligned ? "text-[#e2cfb6]" : "text-[#8f7b63]"}`}>
					{footerText}
				</div>
			</div>
		);
	};

const currentThreadMessages = useMemo(
	() => isAdminOrStaff ? activeMessages : historyByConversation[conversationKey] || EMPTY_MESSAGES,
	[activeMessages, conversationKey, historyByConversation, isAdminOrStaff],
);

	useEffect(() => {
		if (!realtimeReady || !session?.user?.id) return undefined;

		const markLatestIncomingAsSeen = () => {
			if (document.visibilityState !== "visible") return;
			const incomingRole = isAdminOrStaff ? "client" : null;
			const incomingMessage = [...currentThreadMessages].reverse().find((message) =>
				incomingRole
					? message.senderRole === incomingRole
					: ["admin", "staff"].includes(message.senderRole),
			);
			if (!incomingMessage) return;
			sendChatBroadcast("chat_seen", {
				conversationKey: isAdminOrStaff ? activeConversationKey : conversationKey,
				messageId: incomingMessage.id,
				senderId: session.user.id,
			});
		};

		markLatestIncomingAsSeen();
		document.addEventListener("visibilitychange", markLatestIncomingAsSeen);
		return () => document.removeEventListener("visibilitychange", markLatestIncomingAsSeen);
	}, [
		activeConversationKey,
		conversationKey,
		currentThreadMessages,
		isAdminOrStaff,
		realtimeReady,
		sendChatBroadcast,
		session?.user?.id,
	]);

const chatContent = (
	<>
	  {showRefreshToast && (
	    <div className="fixed top-4 right-4 z-50">
	      <div className="btn btn-success btn-sm gap-2 px-4 py-2 shadow-lg">
	        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
	        </svg>
	        Messages refreshed
	      </div>
	    </div>
	  )}
	  {showClearConfirm && (
	    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
	      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
	        <div className="flex items-center gap-3 mb-4">
	          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
	            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
	              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
	            </svg>
	          </div>
	          <div>
	            <h3 className="text-lg font-semibold text-slate-900">Clear Chat?</h3>
	            <p className="text-sm text-slate-500">This will permanently delete this conversation. This action cannot be undone.</p>
	          </div>
	        </div>
	        <div className="flex gap-3 justify-end">
	          <button
	            type="button"
	            onClick={cancelClearChat}
	            className="btn btn-ghost btn-sm px-4"
	          >
	            Cancel
	          </button>
	          <button
	            type="button"
	            onClick={confirmClearChat}
	            className="btn btn-rose btn-sm px-4"
	          >
	            Clear Chat
	          </button>
	        </div>
	      </div>
	    </div>
	  )}
	  {chatToast && (
			<div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
				<button
					type="button"
					onClick={() => {
						if (isAdminOrStaff) setActiveConversationKey(chatToast.conversationKey);
						setChatToast(null);
					}}
					className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-[#8b5e34]/25 bg-white px-4 py-3 text-left shadow-[0_18px_45px_rgba(60,40,20,0.24)] transition hover:border-[#8b5e34]"
				>
					<span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8b5e34] text-white">
						<span className="absolute inset-0 animate-ping rounded-full bg-[#8b5e34]/30" aria-hidden="true" />
						<FiMessageSquare className="relative h-4 w-4" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-semibold text-slate-900">{chatToast.title}</span>
						<span className="mt-0.5 block truncate text-xs text-slate-500">{chatToast.preview}</span>
					</span>
					<span
						role="button"
						tabIndex={0}
						aria-label="Dismiss notification"
						onClick={(event) => {
							event.stopPropagation();
							setChatToast(null);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.stopPropagation();
								setChatToast(null);
							}
						}}
						className="shrink-0 rounded-full px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
					>
						✕
					</span>
				</button>
			</div>
		)}
	  <div className={isBubble ? "flex h-full min-h-0 flex-col bg-white" : "min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 pt-5 sm:px-4 sm:py-6 md:px-6"}>
			<div className={isBubble ? "h-full min-h-0 max-w-none px-0 pb-0" : "mx-auto max-w-7xl px-2 pb-4 sm:px-4 sm:pb-6"}>
				<div className={isBubble ? "relative flex h-full min-h-0 flex-col overflow-hidden bg-white" : "relative overflow-hidden rounded-[2rem] border border-black/5 bg-white/80 shadow-2xl backdrop-blur-xl sm:rounded-[2.5rem]"}>
				<div className={`relative flex min-h-0 flex-col overflow-hidden ${isBubble ? "h-full" : "min-h-[calc(100dvh-8rem)]"} ${isAdminOrStaff && !isBubble ? "lg:flex-row" : ""}`}>
				{isAdminOrStaff && !isBubble && (
					<aside className="flex h-64 lg:h-auto min-h-0 flex-col border-b border-[#ead9c2] bg-white lg:w-84 lg:border-b-0 lg:border-r">
						<div className="border-b border-[#ead9c2] bg-white px-4 py-4">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-xs uppercase tracking-[0.25em] text-[#a06f45]">
										{isAdmin ? "Admin" : "Staff"} Chat
									</p>
									<h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
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
									? "Clients can message you live."
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
											"Customer";
										const conversationAvatar = conversationProfile?.avatar_url || "";
										const conversationUnread = Number(unreadCounts.conversations?.[conversation.key]) || 0;
										return (
											<button
											key={conversation.key}
											type="button"
											onClick={() => {
												setActiveConversationKey(conversation.key);
												markConversationRead(conversation.key);
											}}
												className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
													isActive
														? "border-[#8b5e34] bg-[#fff8ef] shadow-sm"
														: conversationUnread > 0
															? "border-[#d7a86f] bg-[#fffaf3] hover:border-[#8b5e34]"
															: "border-[#ead9c2] bg-white hover:border-[#d7c0a3]"
												}`}
											>
												<div className="flex items-start gap-3">
													<div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ead9c2] bg-[#f4e0c6] text-xs font-bold text-[#8b5e34] shadow-sm">
														{conversationAvatar ? (
															<img
																src={conversationAvatar}
																alt={conversationDisplayName}
																className="h-full w-full object-cover"
															/>
														) : (
															getAvatarInitials(conversationDisplayName)
														)}
														{conversationUnread > 0 && (
															<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#c2410c] px-1 text-[0.6rem] font-bold text-white shadow">
																{conversationUnread > 9 ? "9+" : conversationUnread}
															</span>
														)}
													</div>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-semibold text-slate-900">
															{conversationDisplayName}
														</p>
														<p className={`mt-1 line-clamp-2 text-xs ${conversationUnread > 0 ? "font-medium text-slate-700" : "text-slate-500"}`}>
															{latestPreview}
														</p>
														{conversationUnread > 0 && (
															<p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#c2410c]">
																{conversationUnread} new {conversationUnread === 1 ? "message" : "messages"}
															</p>
														)}
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
						<div
							className={isBubble ? "z-10 flex shrink-0 items-center gap-2.5 border-b border-[#8b5e34]/15 bg-gradient-to-r from-[#8b5e34] to-[#a97a49] px-3 py-2.5 text-white shadow-sm" : "flex flex-col gap-3 border-b border-black/5 bg-white/75 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between"}
							style={isBubble ? { paddingTop: "max(0.5rem, env(safe-area-inset-top))" } : undefined}
						>
							<div className="flex min-w-0 items-center gap-3">
								<button
									type="button"
									onClick={() => isBubble ? onClose?.() : navigate(-1)}
									className={isBubble ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-semibold text-white transition hover:bg-white/25" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4e6] text-lg font-semibold text-slate-900 transition hover:bg-[#f3dfc6]"}
									aria-label={isBubble ? "Close chat" : "Go back"}
								>
									{isBubble ? "×" : "<"}
								</button>

<div className="flex min-w-0 items-center gap-2.5">
									{isBubble && (
										<div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/20 text-xs font-bold text-white">
											{profile?.avatar_url ? (
												<img
													src={profile.avatar_url}
													alt={displayName || "Profile avatar"}
													className="h-full w-full object-cover"
												/>
											) : (
												<span>{display.initials}</span>
											)}
											<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#8b5e34] bg-emerald-400" aria-hidden="true" />
										</div>
									)}
									{!isBubble && <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#ead9c2] bg-[#8b5e34] text-sm font-bold text-white shadow-sm">
										{profile?.avatar_url ? (
											<img
												src={profile.avatar_url}
												alt={displayName || "Profile avatar"}
												className="h-full w-full object-cover"
											/>
										) : (
											<span>{display.initials}</span>
										)}
									</div>}
									<div className="min-w-0">
										<h1 className={isBubble ? "truncate text-sm font-semibold leading-tight text-white" : "text-base font-semibold leading-tight text-slate-900 sm:text-lg"}>
											{isBubble && isAdminOrStaff ? activeThreadName : "Hacienda Amara Support"}
										</h1>
										<p className={isBubble ? "truncate text-[0.7rem] text-white/85" : "text-xs text-slate-600 sm:text-sm"}>
											{isAdminOrStaff
												? adminAvailable
													? isAdmin
														? "Admin online"
														: "Staff online"
													: isAdmin
														? "Admin offline"
														: "Staff offline"
												: (() => {
														const roles = [];
														if (adminOnline) roles.push("Admin");
														if (staffOnline) roles.push("Staff");
														return roles.length > 0
															? `${roles.join(" & ")} online`
															: "Assistant ready";
													})()}
										</p>
										{!isBubble && <p className="truncate text-[0.7rem] text-slate-700 sm:text-xs">
											{profile ? `Signed in as ${displayName}` : "Continue as Guest"}
										</p>}
									</div>
								</div>
							</div>

							<div className={isBubble ? "flex shrink-0 flex-wrap items-center gap-2 lg:justify-end" : "flex flex-wrap items-center gap-2 lg:justify-end"}>
							{isBubble && isAdminOrStaff && conversations.length > 1 && (() => {
								const activeConversation = conversations.find((item) => item.key === activeConversationKey) || conversations[0];
								const activeProfileId = getConversationProfileId(historyByConversation[activeConversation?.key] || []);
								const activeProfile = activeProfileId ? profilesById[activeProfileId] : null;
								const activeName =
									getProfileDisplayName(activeProfile) ||
									activeConversation?.lastMessage?.senderName ||
									"Customer";
								const activeAvatar = activeProfile?.avatar_url || "";
								return (
									<div ref={conversationMenuRef} className="relative">
										<button
											type="button"
											onClick={() => setConversationMenuOpen((open) => !open)}
											aria-haspopup="listbox"
											aria-expanded={conversationMenuOpen}
											className="flex max-w-56 items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-2.5 py-1.5 text-left text-white transition hover:bg-white/25"
										>
											<span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/25 text-[0.6rem] font-bold">
												{activeAvatar ? (
													<img src={activeAvatar} alt={activeName} className="h-full w-full object-cover" />
												) : (
													getAvatarInitials(activeName)
												)}
											</span>
											<span className="min-w-0 flex-1 truncate text-xs font-semibold">{activeName}</span>
											<span aria-hidden="true" className={`text-[0.6rem] transition-transform ${conversationMenuOpen ? "rotate-180" : ""}`}>▼</span>
										</button>

										{conversationMenuOpen && (
											<ul
												role="listbox"
												className="absolute right-0 z-50 mt-2 max-h-72 w-72 overflow-y-auto rounded-2xl border border-[#ead9c2] bg-white p-1.5 shadow-[0_18px_45px_rgba(60,40,20,0.22)]"
											>
												{conversations.map((conversation) => {
													const latest = conversation.lastMessage;
													const profileId = getConversationProfileId(historyByConversation[conversation.key] || []);
													const conversationProfile = profileId ? profilesById[profileId] : null;
													const name =
														getProfileDisplayName(conversationProfile) ||
														latest?.senderName ||
														"Customer";
													const avatar = conversationProfile?.avatar_url || "";
													const preview = latest?.content || "No messages yet.";
													const isActive = conversation.key === activeConversationKey;
													return (
														<li key={conversation.key}>
															<button
																type="button"
																				role="option"
																				aria-selected={isActive}
																				onClick={() => {
																					setActiveConversationKey(conversation.key);
																					setConversationMenuOpen(false);
																				}}
																				className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
																					isActive ? "bg-[#fff8ef]" : "hover:bg-[#fdf6ec]"
																				}`}
																			>
																				<span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ead9c2] bg-[#f4e0c6] text-[0.6rem] font-bold text-[#8b5e34]">
																					{avatar ? (
																						<img src={avatar} alt={name} className="h-full w-full object-cover" />
																					) : (
																						getAvatarInitials(name)
																					)}
																				</span>
																				<span className="min-w-0 flex-1">
																					<span className="block truncate text-xs font-semibold text-slate-900">{name}</span>
																					<span className="block truncate text-[0.68rem] text-slate-500">{preview}</span>
																				</span>
																				{Number(unreadCounts.conversations?.[conversation.key]) > 0 ? (
																					<span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#c2410c] px-1 text-[0.6rem] font-bold text-white">
																						{Number(unreadCounts.conversations[conversation.key]) > 9 ? "9+" : unreadCounts.conversations[conversation.key]}
																					</span>
																				) : latest?.createdAt ? (
																					<span className="shrink-0 text-[0.65rem] text-slate-400">{formatTime(latest.createdAt)}</span>
																				) : null}
																			</button>
														</li>
													);
												})}
											</ul>
										)}
									</div>
								);
							})()}
								{!isBubble && <div className="text-left sm:text-right">
									<p className="text-xs text-slate-600">
										{isAdminOrStaff ? (isAdmin ? "Admin mode" : "Staff mode") : "Client chat"}
									</p>
									<p className="text-[0.7rem] text-slate-500">
										{isAdminOrStaff
											? adminAvailable
												? "Clients can message you live"
												: "Turn online to reply"
											: (() => {
													const roles = [];
													if (adminOnline) roles.push("Admin");
													if (staffOnline) roles.push("Staff");
													return roles.length > 0
														? `${roles.join(" & ")} available`
														: "Assistant will answer";
												})()}
									</p>
								</div>}

<button
                                  type="button"
                                  onClick={refreshMessages}
                                  disabled={loading || isRefreshing}
                                  className={isBubble ? "btn btn-ghost btn-sm h-8 min-h-8 w-8 shrink-0 rounded-full border-0 bg-white/15 p-0 text-white hover:bg-white/25" : "btn btn-black btn-xs shrink-0 rounded-full px-3"}
                                  aria-label="Refresh chat messages"
                                  title={isRefreshing ? "Refreshing..." : "Refresh messages"}
                                >
                                  {isRefreshing ? (
                                    <span className="loading loading-spinner loading-xs" />
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={clearCurrentChat}
                                  disabled={loading}
                                  className={isBubble ? "btn btn-ghost btn-sm h-8 min-h-8 w-8 shrink-0 rounded-full border-0 bg-white/15 p-0 text-white hover:bg-white/25" : "btn btn-ghost btn-xs shrink-0 rounded-full px-3"}
                                  aria-label="Clear current chat"
                                  title="Clear current chat"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>

                                {isAdminOrStaff ? (
									<button
										type="button"
										onClick={() => setAdminAvailable((current) => !current)}
										className={isBubble ? "btn btn-black btn-sm h-10 min-h-10 shrink-0 rounded-full px-3" : "btn btn-black btn-xs shrink-0 rounded-full px-3"}
									>
										{isBubble ? (adminAvailable ? "Offline" : "Online") : (adminAvailable ? "Go offline" : "Go online")}
									</button>
								) : !isBubble ? (
									<span className="shrink-0 rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-base-content">
										{adminOnline ? "Admin/Staff online" : "Assistant ready"}
									</span>
								) : null}
							</div>
						</div>

						<div className="flex min-h-0 flex-1 flex-col bg-white/35">
							<div
								className="flex min-h-0 flex-1 flex-col"
								style={{
									backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,245,230,0.5))",
								}}
							>
								{!isAdminOrStaff && !isBubble && (
									<div className="border-b border-black/5 bg-white/80 px-4 py-4 backdrop-blur-xl sm:px-5">
										<div className="mx-auto flex w-full max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
											<div className="max-w-2xl">
												<div className="flex items-center gap-2 mb-2">
													<div className="h-8 w-8 rounded-xl bg-[#8b5e34]/10 flex items-center justify-center">
														<FiMessageSquare className="h-4 w-4 text-[#8b5e34]" />
													</div>
													<p className="text-xs uppercase tracking-[0.28em] text-base-content/55 font-medium">
														Customer support
													</p>
												</div>
												<h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl leading-tight">
													Hacienda Amara Support
												</h2>
												<p className="mt-2 max-w-xl text-sm leading-6 text-base-content/75">
													Ask about rates, inclusions, availability, location, events, or policies. The assistant replies automatically when admin/staff is offline.
												</p>
											</div>

											<div className="flex flex-wrap gap-2">
												{CLIENT_CHAT_HIGHLIGHTS.map((item) => (
													<span
														key={item}
														className="rounded-full border border-[#8b5e34]/20 bg-[#8b5e34]/5 px-3 py-1.5 text-[0.7rem] font-medium text-[#8b5e34]"
													>
														{item}
													</span>
												))}
											</div>
										</div>
									</div>
								)}

								{!isBubble && <div className="border-b border-black/5 bg-white/75 px-4 py-3 backdrop-blur sm:px-5">
									<p className="text-sm font-medium text-slate-900">
										{isAdminOrStaff
											? `Review and reply to ${activeThreadName}`
											: `Chat with Hacienda Amara support as ${displayName}`}
									</p>
									<p className="text-xs text-base-content/55">
										{isAdminOrStaff
											? "Pick a customer conversation on the left and reply live."
											: adminOnline || staffOnline
												? "Admin/Staff is online and will reply to you shortly."
												: "Admin/Staff is offline, so our assistant will answer automatically."}
									</p>
								</div>}

								<div
									ref={messageListRef}
									onScroll={() => {
										shouldStickToBottomRef.current = isNearBottom();
									}}
									className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-4 sm:px-5"
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
											<div className="mx-auto w-full max-w-2xl space-y-3">
												<div className="overflow-hidden rounded-[1.25rem] border border-[#8b5e34]/20 bg-gradient-to-br from-[#8b5e34] to-[#a97a49] p-4 text-white shadow-lg">
													<p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/70">
														Welcome to Hacienda Amara
													</p>
													<h3 className="mt-1 text-lg font-semibold leading-tight">
														How can we help you today?
													</h3>
													<p className="mt-1.5 text-[0.78rem] leading-5 text-white/85">
														Pick an action below or ask a question. We answer instantly, and our team replies live when available.
													</p>
													<div className="mt-3 flex flex-wrap gap-1.5">
														{CLIENT_CHAT_HIGHLIGHTS.map((item) => (
															<span key={item} className="rounded-full bg-white/15 px-2.5 py-1 text-[0.65rem] font-medium text-white">
																{item}
															</span>
														))}
													</div>
												</div>

												<div className="rounded-[1.25rem] border border-[#ead9c2] bg-white p-3 shadow-sm">
													<p className="mb-2 px-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]/70">
														Jump to
													</p>
													<div className="grid grid-cols-2 gap-1.5">
														{quickActions.map((action) => (
															<button
																key={action.id}
																type="button"
																onClick={() => navigate(action.to)}
																className="flex items-center gap-1.5 rounded-xl border border-[#ead9c2] bg-[#fffaf3] px-2.5 py-2 text-left text-[0.72rem] font-medium text-[#6b4a2c] transition hover:border-[#8b5e34] hover:bg-[#8b5e34] hover:text-white"
															>
																<span className="truncate">{action.label}</span>
																<span aria-hidden="true" className="ml-auto text-[0.6rem] opacity-60">›</span>
															</button>
														))}
													</div>
												</div>
											</div>
										) : (
											currentThreadMessages.map(renderMessage)										)}
						{remoteTyping && (isAdminOrStaff ? remoteTyping.role === "client" : remoteTyping.role !== "client") && (
							<p role="status" className="mx-auto mr-auto rounded-full bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-sm">
								{remoteTyping.name} is typing<span aria-hidden="true">...</span>
							</p>
						)}

									</div>
								</div>

						<div className={isBubble ? "shrink-0 border-t border-black/5 bg-white px-3 py-2" : "border-t border-black/5 bg-white/80 px-3 py-3 backdrop-blur-xl sm:px-5"}
							style={isBubble ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" } : undefined}
						>
									<div className={isBubble ? "mx-auto mb-2 w-full" : "mx-auto mb-3 w-full max-w-4xl rounded-[1.25rem] border border-black/5 bg-white px-3 py-3 shadow-sm"}>
										<div className={isBubble ? "mb-1 flex items-center gap-2" : "mb-2.5 flex items-center justify-between gap-3 px-1"}>
											<p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]/75">
												Quick actions
											</p>
											{!isBubble && <p className="text-[0.7rem] text-slate-500">Open a page instantly</p>}
										</div>
										<div className={isBubble ? "-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5" : "flex flex-wrap gap-1.5"}>
											{quickActions.map((action) => (
												<button
													key={action.id}
													type="button"
													onClick={() => navigate(action.to)}
													className="shrink-0 rounded-lg bg-[#8b5e34] px-2.5 py-1.5 text-[0.7rem] font-semibold text-white transition hover:bg-[#6f4a28]"
												>
													{action.label}
												</button>
											))}
										</div>

										<div className={isBubble ? "mb-1 mt-2 flex items-center gap-2" : "mb-2.5 mt-3 flex items-center justify-between gap-3 px-1"}>
											<p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]/75">
												Quick questions
											</p>
											{!isBubble && <p className="text-[0.7rem] text-slate-500">Tap to ask instantly</p>}
										</div>
										<div className={isBubble ? "-mx-1 flex max-h-20 gap-1.5 overflow-y-auto px-1 pb-1" : "flex flex-wrap gap-1.5"}>
											{QUICK_QUESTIONS.map((question) => (
												<button
													key={question.id}
													type="button"
													onClick={() => sendChatText(question.prompt)}
													disabled={isSending || loading}
													className="shrink-0 rounded-lg border border-[#8b5e34]/25 bg-[#fffaf3] px-2.5 py-1.5 text-[0.7rem] font-medium text-[#6b4a2c] transition hover:border-[#8b5e34] hover:bg-[#8b5e34] hover:text-white disabled:opacity-50"
												>
													{question.label}
												</button>
											))}
										</div>
									</div>

									{error && (
										<div className="mx-auto mb-3 max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
											{error}
										</div>
									)}
									{isAdminOrStaff && adminAvailable && !hasClientMessage(activeMessages) && (
										<p role="status" className="mx-auto mb-3 max-w-4xl text-sm text-slate-600">
											Select a customer conversation with a saved message before sending.
										</p>
									)}
									{chatAuthError && (
										<div role="alert" className="mx-auto mb-3 max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
											{chatAuthError}
										</div>
									)}
									<p className={isBubble ? "sr-only" : "mx-auto mb-3 max-w-4xl text-[0.7rem] text-slate-500"}>
										Press Enter to send. Shift + Enter for a new line.
									</p>
									<p className={isBubble ? "sr-only" : "mx-auto mb-3 max-w-4xl text-[0.7rem] text-slate-500"}>
										Share or browse guest photos and videos on <NavLink to="/reviews" className="font-bold underline">Reviews</NavLink>.
									</p>

									<form
										onSubmit={handleSubmit}
										className={isBubble ? "mx-auto flex w-full flex-col gap-2" : "mx-auto flex w-full max-w-4xl flex-col gap-2 sm:flex-row sm:items-end"}
									>
										<div className={isBubble ? "flex min-w-0 flex-1 items-end gap-2" : "contents"}>
										<div className={isBubble ? "min-w-0 flex-1 rounded-[1.25rem] border border-[#ead9c2] bg-white px-3 py-2 shadow-sm" : "w-full flex-1 rounded-[1.25rem] border border-[#ead9c2] bg-white px-4 py-2 shadow-sm sm:rounded-full"}>
											<textarea
												value={prompt}
												maxLength={1200}
								onChange={handlePromptChange}
												onKeyDown={handleKeyDown}
												placeholder={
													isAdminOrStaff && !adminAvailable
														? "Go online to reply..."
														: "Write a message..."
												}
												rows={1}
												disabled={!chatAuthReady || Boolean(chatAuthError) || isSending || (isAdminOrStaff && !adminAvailable)}
												className={isBubble ? "min-h-11 max-h-24 w-full resize-none bg-transparent text-[0.8125rem] leading-5 text-slate-900 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed" : "max-h-28 w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"}
											/>
										</div>

										<button
											type="submit"
											disabled={!prompt.trim() || loading || !chatAuthReady || Boolean(chatAuthError) || isSending || (isAdminOrStaff && !canReply)}
											className={isBubble ? "btn btn-black btn-circle h-11 w-11 min-h-11 shrink-0" : "btn btn-black rounded-full px-5 sm:w-auto"}
							aria-label="Send message"
										>
							{isSending ? <span className="loading loading-spinner loading-xs" /> : isBubble ? <FiSend className="h-4 w-4" /> : "Send"}
										</button>
										</div>
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
							<ChatVideo attachment={selectedMedia} source={getAttachmentSource(selectedMedia)} />
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
		</>
	);

	return isBubble ? <div className="h-full min-h-0">{chatContent}</div> : <MainLayout>{chatContent}</MainLayout>;
};

const Chat = (props) => {
	const { session, profile } = useContext(SessionContext);
	const chatIdentity = profile?.id || session?.user?.id || "guest";

	return <ChatConversation key={chatIdentity} {...props} />;
};

export default Chat;
