import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiMessageSquare, FiX } from "react-icons/fi";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext.jsx";

const CHAT_BUBBLE_STORAGE_KEY = "hacienda-amara-chat-bubble-state";
const SharedChat = lazy(() => import("../pages/Chat.jsx"));

const ChatBubbleLauncher = () => {
	const location = useLocation();
	const { profile } = useContext(SessionContext);
	const [isOpen, setIsOpen] = useState(() => localStorage.getItem(CHAT_BUBBLE_STORAGE_KEY) === "true");
	const [position, setPosition] = useState({ bottom: "5rem", right: "1.5rem" });

	useEffect(() => {
		localStorage.setItem(CHAT_BUBBLE_STORAGE_KEY, String(isOpen));
	}, [isOpen]);

	// Hide chat on login page and chat page
	if (location.pathname === "/log-in" || location.pathname === "/chat") return null;

	// Show chat for guests (not logged in)
	if (profile) {
		// Optionally: only show for specific roles
		// if (!["admin", "staff"].includes(profile?.role)) return null;
	}

	return (
		<>
			{isOpen && (
				<section
					role="dialog"
					aria-label="Hacienda Amara chat"
					className="fixed z-40 h-[min(26rem,calc(100dvh-11.5rem))] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
					style={{ bottom: position.bottom, right: position.right }}
				>
					<Suspense fallback={<div className="flex h-full items-center justify-center"><span className="loading loading-spinner loading-md text-amber-700" /></div>}>
						<SharedChat presentation="bubble" onClose={() => setIsOpen(false)} />
					</Suspense>
				</section>
			)}

			<button
				type="button"
				onClick={() => setIsOpen((open) => !open)}
				className="fixed z-39 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-2xl transition-transform hover:scale-105"
				style={{ bottom: position.bottom, right: position.right }}
				aria-label={isOpen ? "Close chat" : "Open chat"}
				aria-expanded={isOpen}
			>
				{isOpen ? <FiX className="h-6 w-6" /> : <FiMessageSquare className="h-7 w-7" />}
			</button>
		</>
	);
};

export default ChatBubbleLauncher;
