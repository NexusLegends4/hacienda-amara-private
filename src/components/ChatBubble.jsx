import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { FiMessageSquare, FiX, FiSend, FiArrowUpRight, FiImage, FiChevronDown, FiBell } from "react-icons/fi";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";
import { useNavigate, useLocation } from "react-router-dom";

const CHAT_BUBBLE_STORAGE_KEY = "hacienda-amara-chat-bubble-state";
const ADMIN_AVAILABILITY_KEY = "hacienda-amara-admin-available-v1";
const MEDIA_CONTENT_PREFIX = "__HACIENDA_MEDIA__";
const CHAT_MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_CHAT_MEDIA_BUCKET || "chat-media";
const BOT_DISPLAY_NAME = "Hacienda Amara Assistant";
const BROADCAST_CHANNEL = "hacienda-amara-support-room";

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
		return "We're at B30 L12 Itneg Street Phase 3 Amityville Bgry. San Jose, Rodriguez, Rizal, Philippines, 1860. [Open Google Maps](https://www.google.com/maps/search/?api=1&query=B30%20L12%20Itneg%20Street%20Phase%203%20Amityville%20Bgry.%20San%20Jose%2C%20Rodriguez%2C%20Rizal%2C%20Philippines%2C%201860)";
	}

	if (includesAny(["facebook page", "fb page", "facebook link", "fb link", "facebook", "fb", "meta page"])) {
		return "Here is our official Facebook page: [Open Facebook Page](https://www.facebook.com/HaciendaAmara/)";
	}

	if (includesAny(["rate", "rates", "package", "packages", "promo", "discount", "down payment", "payment", "deposit", "mode of payment", "gcash", "cash", "bank transfer"])) {
		return "2026 Rates for 20 pax: Day Time (₱6,999-₱7,999), Night Time (₱7,999-₱8,999), Overnight (₱14,999-₱17,999). Extra guests: ₱200/head. Kids 8 & below are FREE!";
	}

	if (includesAny(["availability", "available po", "slot", "booking", "reserve", "reserve po", "reservation", "book"])) {
		return "Available po ba sa chosen date? I can help check that. For booking, please send your date, time, and guest count. Note: Prices are for 20 pax, additional pax at ₱200/head. Kids 8 and below are FREE.";
	}

	if (includesAny(["overnight", "day tour", "how many guests", "guest limit", "capacity", "allowed"])) {
		return "We offer Day Time (9AM-6PM), Night Time (9PM-6AM), and 21-hour Overnight stays. Rates are for 20 pax. Additional pax: ₱200/head. Kids 8 and below are FREE.";
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

	return "Thanks for your message. If you need more help, ask about availability, rates, amenities, location, events, rules, policies, photos, or nationwide bookings.";
};

const getMessageId = () => crypto.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const encodeMessageContent = (content, attachments = []) => {
	if (!Array.isArray(attachments) || attachments.length === 0) return content || "";
	return `${MEDIA_CONTENT_PREFIX}${JSON.stringify({ content: content || "", attachments })}`;
};

const decodeMessageContent = (rawContent) => {
	if (typeof rawContent !== "string") return { content: "", attachments: [] };
	if (!rawContent.startsWith(MEDIA_CONTENT_PREFIX)) return { content: rawContent, attachments: [] };
	try {
		const parsed = JSON.parse(rawContent.slice(MEDIA_CONTENT_PREFIX.length));
		return { content: typeof parsed.content === "string" ? parsed.content : "", attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [] };
	} catch {
		return { content: rawContent.replace(MEDIA_CONTENT_PREFIX, ""), attachments: [] };
	}
};

const buildStoragePath = (messageId, attachment) => {
	const extension = (attachment.name?.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
	const fileName = String(attachment.name || attachment.kind || "media").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || attachment.kind || "media";
	const suffix = extension ? `.${extension}` : "";
	return `messages/${messageId}/${attachment.id || getMessageId()}-${fileName}${suffix}`;
};

const formatTime = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const readFileAsObjectUrl = (file) => URL.createObjectURL(file);
const revokePreviewUrl = (attachment) => {
	if (!attachment?.previewUrl?.startsWith("blob:")) return;
	URL.revokeObjectURL(attachment.previewUrl);
};

const getAttachmentSource = (attachment) => attachment?.url || attachment?.publicUrl || attachment?.dataUrl || attachment?.previewUrl || "";

const ChatBubble = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const location = useLocation();
	const isAdmin = profile?.role === "admin";
	const isStaff = profile?.role === "staff";
	const isAdminOrStaff = isAdmin || isStaff;

	// Hide bubble on chat page
	const isChatPage = location.pathname === "/chat";
	if (isChatPage) return null;

	const conversationKey = `guest-${session?.user?.id || localStorage.getItem("hacienda-amara-guest-conversation-key") || Date.now()}`;

	const [isOpen, setIsOpen] = useState(() => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem(CHAT_BUBBLE_STORAGE_KEY) === "true";
	});
	const [unreadCount, setUnreadCount] = useState(0);
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [draftAttachments, setDraftAttachments] = useState([]);
	const [adminAvailable, setAdminAvailable] = useState(() => {
		if (typeof window === "undefined" || !isAdmin) return false;
		const saved = localStorage.getItem(ADMIN_AVAILABILITY_KEY);
		return saved ? saved === "true" : true;
	});
	const [presenceOnline, setPresenceOnline] = useState(false);
	const [historyByConversation, setHistoryByConversation] = useState({});
	const [activeConversationKey, setActiveConversationKey] = useState(conversationKey);
	const [profilesById, setProfilesById] = useState({});
	const [selectedMedia, setSelectedMedia] = useState(null);
	const [error, setError] = useState("");
	const messageListRef = useRef(null);
	const pendingScrollToBottomRef = useRef(true);
	const channelRef = useRef(null);
	const photoInputRef = useRef(null);
	const videoInputRef = useRef(null);
	const dbAvailableRef = useRef(true);
	const isRefreshingHistoryRef = useRef(false);

	const displayName = profile ? `${profile.firstname} ${profile.lastname}`.trim() : "Guest";
	const activeMessages = historyByConversation[activeConversationKey] || [];
	const sidebarProfiles = useMemo(() => {
		if (!isAdmin) return [];
		const ids = new Set();
		Object.values(historyByConversation).forEach((msgs) => {
			const profileId = msgs.slice().reverse().find((m) => m.senderRole === "client" && m.senderId && m.senderId !== "guest")?.senderId;
			if (profileId) ids.add(profileId);
		});
		return [...ids];
	}, [historyByConversation, isAdmin]);

	const conversations = useMemo(() => {
		if (!isAdmin) return [{ key: conversationKey, lastMessage: activeMessages[activeMessages.length - 1] || null }];
		return Object.entries(historyByConversation)
			.map(([key, msgs]) => ({ key, lastMessage: msgs[msgs.length - 1] || null }))
			.sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
	}, [activeMessages, conversationKey, historyByConversation, isAdmin]);

	const adminOnline = presenceOnline;
	const canReply = !isAdmin || adminAvailable;

	const scrollMessagesToBottom = (behavior = "smooth") => {
		const container = messageListRef.current;
		if (!container) return;
		container.scrollTo({ top: container.scrollHeight, behavior });
	};

	const fetchMessages = async () => {
		if (!session) return;
		try {
			let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
			if (!isAdmin) query = query.eq("conversation_key", conversationKey);
			const { data, error } = await query;
			if (!error && data) {
				const grouped = {};
				data.forEach((row) => {
					const { content, attachments } = decodeMessageContent(row.content);
					const msg = { id: row.id, conversationKey: row.conversation_key, senderId: row.sender_id, senderRole: row.sender_role, senderName: row.sender_name, content, attachments, createdAt: row.created_at };
					grouped[msg.conversationKey] = grouped[msg.conversationKey] || [];
					if (!grouped[msg.conversationKey].some((m) => m.id === msg.id)) grouped[msg.conversationKey].push(msg);
				});
				const next = isAdmin ? grouped : { [conversationKey]: grouped[conversationKey] || [] };
				setHistoryByConversation(next);
				if (!isAdmin) {
					const unread = (grouped[conversationKey] || []).filter((m) => m.senderRole === "admin" && !m.read).length;
					setUnreadCount(unread);
				}
			}
		} catch (e) {
			console.error("Fetch error:", e);
		} finally {
			setLoading(false);
		}
	};

	const mergeMessage = (message) => {
		setHistoryByConversation((current) => {
			const existing = current[message.conversationKey] || [];
			if (existing.some((m) => m.id === message.id)) return current;
			return { ...current, [message.conversationKey]: [...existing, message].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) };
		});
	};

	const persistMessage = async (message) => {
		if (!dbAvailableRef.current) return;
		try {
			const { error } = await supabase.from("chat_messages").insert({
				id: message.id,
				conversation_key: message.conversationKey,
				sender_id: message.senderId,
				sender_role: message.senderRole,
				sender_name: message.senderName,
				content: encodeMessageContent(message.content, message.attachments),
				created_at: message.createdAt,
			});
			if (error && (error.message?.includes("does not exist") || error.details?.includes("relation"))) dbAvailableRef.current = false;
		} catch (e) {
			if (String(e).includes("does not exist") || String(e).includes("relation")) dbAvailableRef.current = false;
		}
	};

	const refreshFromDb = async () => {
		if (!dbAvailableRef.current) return false;
		isRefreshingHistoryRef.current = true;
		try {
			let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
			if (!isAdmin) query = query.eq("conversation_key", conversationKey);
			const { data, error } = await query;
			if (error && (error.message?.includes("does not exist") || error.details?.includes("relation"))) { dbAvailableRef.current = false; return false; }
			const grouped = {};
			(data || []).forEach((row) => {
				const { content, attachments } = decodeMessageContent(row.content);
				const msg = { id: row.id, conversationKey: row.conversation_key, senderId: row.sender_id, senderRole: row.sender_role, senderName: row.sender_name, content, attachments, createdAt: row.created_at };
				grouped[msg.conversationKey] = grouped[msg.conversationKey] || [];
				if (!grouped[msg.conversationKey].some((m) => m.id === msg.id)) grouped[msg.conversationKey].push(msg);
			});
			const next = isAdmin ? grouped : { [conversationKey]: grouped[conversationKey] || [] };
			setHistoryByConversation(next);
			return next;
		} catch { return false; } finally { isRefreshingHistoryRef.current = false; }
	};

	const sendMessage = async (e) => {
		e.preventDefault();
		const text = newMessage.trim();
		if ((!text && draftAttachments.length === 0) || sending) return;
		if (isAdmin && !canReply) return;

		setSending(true);
		const messageId = getMessageId();
		const uploadAttachment = async (att) => {
			if (!att?.file) return { id: att?.id || getMessageId(), kind: att?.kind || "image", name: att?.name || "Attached media", mimeType: att?.mimeType || "application/octet-stream", url: getAttachmentSource(att) };
			const storagePath = buildStoragePath(messageId, att);
			const { error } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(storagePath, att.file, { contentType: att.mimeType || att.file.type, upsert: false });
			if (error) throw new Error(error.message || "Upload failed");
			const { data } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(storagePath);
			return { id: att.id || getMessageId(), kind: att.kind, name: att.name, mimeType: att.mimeType, url: data.publicUrl, path: storagePath, bucket: CHAT_MEDIA_BUCKET };
		};

		const uploaded = await Promise.all(draftAttachments.map(uploadAttachment));
		const message = { id: messageId, conversationKey: isAdmin ? activeConversationKey : conversationKey, senderId: profile?.id || "guest", senderRole: isAdmin ? "admin" : "client", senderName: displayName, content: text, attachments: uploaded, createdAt: new Date().toISOString() };

		setNewMessage("");
		draftAttachments.forEach(revokePreviewUrl);
		setDraftAttachments([]);
		mergeMessage(message);
		await persistMessage(message);

		const channel = channelRef.current;
		if (channel) await channel.send({ type: "broadcast", event: "message", payload: message });

		if ((!isAdmin && !adminOnline) || text.toLowerCase().includes("where is") || text.toLowerCase().includes("location") || text.toLowerCase().includes("about") || text.toLowerCase().includes("rules") || text.toLowerCase().includes("pay")) {
			setTimeout(async () => {
				const botReply = getBotReply(text);
				const botMessage = { id: getMessageId(), conversationKey: message.conversationKey, senderId: "bot", senderRole: "bot", senderName: BOT_DISPLAY_NAME, content: botReply, attachments: [], createdAt: new Date().toISOString() };
				pendingScrollToBottomRef.current = true;
				mergeMessage(botMessage);
				await persistMessage(botMessage);
				if (channel) await channel.send({ type: "broadcast", event: "message", payload: botMessage });
			}, 650);
		}
		setSending(false);
	};

	const handleAttachment = async (e, kind) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (kind === "image" && !file.type.startsWith("image/")) return;
		if (kind === "video" && !file.type.startsWith("video/")) return;
		const attachment = { id: getMessageId(), kind, name: file.name, mimeType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), file, previewUrl: readFileAsObjectUrl(file) };
		setDraftAttachments((cur) => { const replaced = cur.find((i) => i.kind === kind); if (replaced) revokePreviewUrl(replaced); return [...cur.filter((i) => i.kind !== kind), attachment]; });
	};

	useEffect(() => {
		localStorage.setItem(CHAT_BUBBLE_STORAGE_KEY, String(isOpen));
	}, [isOpen]);

	useEffect(() => {
		fetchMessages();
		const channel = supabase.channel(BROADCAST_CHANNEL);
		channelRef.current = channel;
		const applyPresence = () => { setPresenceOnline(Object.values(channel.presenceState()).flat().some((e) => e.role === "admin" && e.available)); };
		channel.on("broadcast", { event: "message" }, ({ payload }) => {
			if (isRefreshingHistoryRef.current) return;
			if (isAdmin ? payload.conversationKey === activeConversationKey : payload.conversationKey === conversationKey) {
				setHistoryByConversation((cur) => { const existing = cur[payload.conversationKey] || []; if (existing.some((m) => m.id === payload.id)) return cur; return { ...cur, [payload.conversationKey]: [...existing, payload].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) }; });
			}
			if (!isAdmin && payload.senderRole === "admin") setUnreadCount((c) => c + 1);
		});
		channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_key=eq.${conversationKey}` }, ({ new: row }) => {
			if (isRefreshingHistoryRef.current) return;
			const { content, attachments } = decodeMessageContent(row.content);
			const msg = { id: row.id, conversationKey: row.conversation_key, senderId: row.sender_id, senderRole: row.sender_role, senderName: row.sender_name, content, attachments, createdAt: row.created_at };
			setHistoryByConversation((cur) => { const existing = cur[msg.conversationKey] || []; if (existing.some((m) => m.id === msg.id)) return cur; return { ...cur, [msg.conversationKey]: [...existing, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) }; });
			if (!isAdmin && msg.senderRole === "admin") setUnreadCount((c) => c + 1);
		});
		channel.on("presence", { event: "sync" }, applyPresence);
		channel.on("presence", { event: "join" }, applyPresence);
		channel.on("presence", { event: "leave" }, applyPresence);
		channel.subscribe(async (status) => {
			if (status !== "SUBSCRIBED") return;
			if (isAdmin && adminAvailable) await channel.track({ role: "admin", available: true, name: displayName, profileId: profile.id });
			else if (!isAdmin) await channel.track({ role: "client", available: true, name: displayName, profileId: profile.id, conversationKey });
		});
		return () => { channel.unsubscribe(); channelRef.current = null; };
	}, [adminAvailable, conversationKey, displayName, isAdmin, profile, activeConversationKey]);

	useEffect(() => { if (isOpen) setUnreadCount(0); }, [isOpen]);

	const handleOpen = () => { navigate("/chat"); };

	if (!session && !isAdminOrStaff) {
		return (
			<>
				<button onClick={handleOpen} className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform ${unreadCount > 0 ? "animate-bounce" : ""}`} aria-label="Open chat">
					<FiMessageSquare className="w-7 h-7" />
					{unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
				</button>
			</>
		);
	}

	if (isAdminOrStaff) {
		return (
			<>
				<button onClick={handleOpen} className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform ${unreadCount > 0 ? "animate-bounce" : ""}`} aria-label="Open chat">
					<FiMessageSquare className="w-7 h-7" />
					{unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
				</button>
			</>
		);
	}

	return null;
};

export default ChatBubble;