import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiMessageSquare, FiX } from "react-icons/fi";

const CHAT_BUBBLE_STORAGE_KEY = "hacienda-amara-chat-bubble-state";
const SharedChat = lazy(() => import("../pages/Chat.jsx"));

const ChatBubbleLauncher = () => {
	const location = useLocation();
	const [isOpen, setIsOpen] = useState(() => localStorage.getItem(CHAT_BUBBLE_STORAGE_KEY) === "true");

	useEffect(() => {
		localStorage.setItem(CHAT_BUBBLE_STORAGE_KEY, String(isOpen));
	}, [isOpen]);

	if (location.pathname === "/chat") return null;

	return (
		<>
			{isOpen && (
				<section
					role="dialog"
					aria-label="Hacienda Amara chat"
					className="fixed bottom-[4.5rem] right-3 z-40 h-[min(26rem,calc(100dvh-11.5rem))] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl sm:bottom-[6rem] sm:right-6"
				>
					<Suspense fallback={<div className="flex h-full items-center justify-center"><span className="loading loading-spinner loading-md text-amber-700" /></div>}>
						<SharedChat presentation="bubble" onClose={() => setIsOpen(false)} />
					</Suspense>
				</section>
			)}

			<button
				type="button"
				onClick={() => setIsOpen((open) => !open)}
				className="fixed bottom-5 right-5 z-39 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-2xl transition-transform hover:scale-105"
				aria-label={isOpen ? "Close chat" : "Open chat"}
				aria-expanded={isOpen}
			>
				{isOpen ? <FiX className="h-6 w-6" /> : <FiMessageSquare className="h-7 w-7" />}
			</button>
		</>
	);
};

export default ChatBubbleLauncher;
