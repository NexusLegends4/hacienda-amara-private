import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiMessageSquare, FiX } from "react-icons/fi";
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
	const position = { bottom: "1.5rem", right: "1.5rem" };
	const chatIdentity = profile?.id || session?.user?.id || "guest";

	useEffect(() => {
		localStorage.setItem(CHAT_BUBBLE_STORAGE_KEY, String(isOpen));
	}, [isOpen]);

	// Hide chat on login page and chat page
	if (location.pathname === "/log-in" || location.pathname === "/chat") return null;

	// Guests and non-logged-in visitors can access the support chat too.
	return (
		<>
			{isOpen && (
				<section
					role="dialog"
					aria-label="Hacienda Amara chat"
					className="fixed z-40 h-[min(30rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
					style={{ bottom: position.bottom, right: position.right }}
				>
					<Suspense fallback={<div className="flex h-full items-center justify-center"><span className="loading loading-spinner loading-md text-amber-700" /></div>}>
						<SharedChat key={chatIdentity} presentation="bubble" onClose={() => setIsOpen(false)} />
					</Suspense>
				</section>
			)}

			<button
				type="button"
				onClick={() => setIsOpen((open) => !open)}
				className="fixed z-39 flex h-12 w-12 items-center justify-center rounded-full bg-[#0e0f10] text-white shadow-[0_12px_24px_rgba(15,23,42,0.25)] transition-transform hover:scale-105"
				style={{ bottom: position.bottom, right: position.right }}
				aria-label={isOpen ? "Close chat" : "Open chat"}
				aria-expanded={isOpen}
			>
				{isOpen ? <FiX className="h-5 w-5" /> : <FiMessageSquare className="h-5 w-5" />}
			</button>
		</>
	);
};

const ChatBubble = () => {
	const { session } = useContext(SessionContext);
	return <ChatBubbleLauncher key={session?.user?.id || "guest"} />;
};

export default ChatBubble;
