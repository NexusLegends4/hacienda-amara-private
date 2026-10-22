import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiMessageSquare } from "react-icons/fi";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";

const CHAT_BUBBLE_STORAGE_KEY = "hacienda-amara-chat-bubble-state";
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

	useEffect(() => {
		localStorage.setItem(CHAT_BUBBLE_STORAGE_KEY, String(isOpen));
	}, [isOpen]);

	// Hide chat on login page
	if (location.pathname === "/log-in") return null;

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
						<SharedChat key={chatIdentity} presentation="bubble" onClose={() => setIsOpen(false)} />
					</Suspense>
				</section>
			)}

			{!isOpen && (
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#a97a49] to-[#7a5028] text-white shadow-[0_12px_30px_rgba(122,80,40,0.35)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8b5e34]/30"
					style={{ bottom: "1.5rem", right: "1.5rem" }}
					aria-label="Open Hacienda Amara chat support"
					aria-expanded={isOpen}
				>
					<span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#8b5e34]/25" aria-hidden="true" />
					<FiMessageSquare className="h-6 w-6" />
					<span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 px-1 text-[0.6rem] font-bold text-white">
						1
					</span>
					<span className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-[#3b2a1a] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
						Chat with us
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
