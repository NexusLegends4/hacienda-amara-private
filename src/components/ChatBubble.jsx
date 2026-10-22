import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { FiMessageSquare } from "react-icons/fi";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { supabase } from "../utils/supabase";
import {
	clearUnread,
	getIdentityKey,
	getUnreadState,
	incrementUnread,
	subscribeUnread,
} from "../utils/chat-unread";
import { playChatTone, requestNotificationPermissionOnce, showDesktopNotification } from "../utils/chat-notifications";

const CHAT_BUBBLE_STORAGE_KEY = "hacienda-amara-chat-bubble-state";
const UNREAD_POLL_MS = 8000;
const SharedChat = lazy(() => import("../pages/Chat.jsx"));

const ChatBubbleLauncher = () => {
	const location = useLocation();
	const { profile, session } = useContext(SessionContext);
	const [isOpen, setIsOpen] = useState(() => {
		const storedValue = localStorage.getItem(CHAT_BUBBLE_STORAGE_KEY);
		if (storedValue !== null) return storedValue === "true";
		return location.pathname === "/";
	});
	const chatIdentity = profile?.id || session?.user?.id || "guest";
	const isStaff = profile?.role === "admin" || profile?.role === "staff";
	const unreadIdentity = useMemo(
		() => getIdentityKey(isStaff ? (profile?.role === "admin" ? "admin" : "staff") : "client", session?.user?.id || profile?.id || "anonymous"),
		[isStaff, profile?.role, profile?.id, session?.user?.id],
	);
	const lastSeenAtRef = useRef(0);
	useEffect(() => {
		lastSeenAtRef.current = Date.now();
	}, [unreadIdentity]);

	useEffect(() => {
		localStorage.setItem(CHAT_BUBBLE_STORAGE_KEY, String(isOpen));
	}, [isOpen]);

	// Keep the launcher badge in sync with the shared unread store.
	const unreadCounts = useSyncExternalStore(
		useCallback((callback) => subscribeUnread(callback), []),
		useCallback(() => getUnreadState(unreadIdentity), [unreadIdentity]),
	);

	// The chat window is not mounted while the bubble is closed, so a light
	// poll watches for replies that arrive while the customer is away.
	useEffect(() => {
		if (isOpen || isStaff) return undefined;
		const conversationKey = session?.user?.id || profile?.id;
		if (!conversationKey) return undefined;

		const poll = async () => {
			try {
				const { data, error } = await supabase
					.from("chat_messages")
					.select("id, sender_role, sender_name, content, created_at")
					.eq("conversation_key", conversationKey)
					.in("sender_role", ["admin", "staff", "bot"])
					.order("created_at", { ascending: false })
					.limit(5);
				if (error || !Array.isArray(data) || data.length === 0) return;
				const newMsgs = data
					.map((m) => ({ ...m, createdAt: new Date(m.created_at).getTime() }))
					.filter((m) => m.createdAt > lastSeenAtRef.current);
				if (newMsgs.length === 0) return;
				lastSeenAtRef.current = Math.max(...newMsgs.map((m) => m.createdAt));
				newMsgs.forEach(() => incrementUnread(unreadIdentity, conversationKey));
				playChatTone("incoming");
				const latest = newMsgs[newMsgs.length - 1];
				const title = `${latest.sender_name || "Support"} replied to your chat`;
				const preview = String(latest.content || "New message").slice(0, 90);
				showDesktopNotification(title, preview);
			} catch {
				// A failed poll simply means the badge catches up later.
			}
		};

		const timer = window.setInterval(poll, UNREAD_POLL_MS);
		void poll();
		return () => window.clearInterval(timer);
	}, [isOpen, isStaff, profile?.id, session?.user?.id, unreadIdentity]);

	const handleOpen = useCallback(() => {
		setIsOpen(true);
		lastSeenAtRef.current = Date.now();
		clearUnread(unreadIdentity, session?.user?.id || profile?.id);
		// Ask once for desktop notification permission, from a user gesture.
		requestNotificationPermissionOnce();
	}, [profile?.id, session?.user?.id, unreadIdentity]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
	}, []);

	// Hide chat on login page
	if (location.pathname === "/log-in") return null;

	const unreadTotal = Number(unreadCounts.total) || 0;

	// Guests and non-logged-in visitors can access the support chat too.
	return (
		<>
			{isOpen && (
				<section
					role="dialog"
					aria-label="Hacienda Amara chat"
					className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden border-0 bg-white sm:inset-auto sm:bottom-3 sm:right-3 sm:top-3 sm:h-auto sm:max-h-none sm:w-[min(26rem,calc(100vw-1.5rem))] sm:rounded-[1.75rem] sm:border sm:border-[#8b5e34]/25 sm:shadow-[0_28px_70px_rgba(60,40,20,0.28)]"
				>
					<Suspense fallback={<div className="flex h-full items-center justify-center"><span className="loading loading-spinner loading-md text-[#8b5e34]" /></div>}>
						<SharedChat key={chatIdentity} presentation="bubble" onClose={handleClose} />
					</Suspense>
				</section>
			)}

			{!isOpen && (
				<button
					type="button"
					onClick={handleOpen}
					className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#a97a49] to-[#7a5028] text-white shadow-[0_12px_30px_rgba(122,80,40,0.35)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8b5e34]/30"
					style={{ bottom: "1.5rem", right: "1.5rem" }}
					aria-label={
						unreadTotal > 0
							? `Open Hacienda Amara chat support, ${unreadTotal} unread message${unreadTotal === 1 ? "" : "s"}`
							: "Open Hacienda Amara chat support"
					}
					aria-expanded={isOpen}
				>
					<span
						className={`absolute inset-0 -z-10 rounded-full bg-[#8b5e34]/25 ${unreadTotal > 0 ? "animate-ping" : "animate-pulse"}`}
						aria-hidden="true"
					/>
					<FiMessageSquare className="h-6 w-6" />
					{unreadTotal > 0 ? (
						<span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#c2410c] px-1 text-[0.6rem] font-bold text-white shadow">
							{unreadTotal > 9 ? "9+" : unreadTotal}
						</span>
					) : (
						<span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
					)}
					<span className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-[#3b2a1a] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
						{unreadTotal > 0 ? `${unreadTotal} new message${unreadTotal === 1 ? "" : "s"}` : "Chat with us"}
					</span>
				</button>
			)}
		</>
	);
};

const ChatBubble = () => {
	const { session } = useContext(SessionContext);
	return <ChatBubbleLauncher key={session?.user?.id || "guest"} />;
};

export default ChatBubble;
