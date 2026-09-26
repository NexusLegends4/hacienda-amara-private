import React from "react";
import NavBar from "../components/NavBar";
import ChatBubble from "../components/ChatBubble";

const MainLayout = ({ children, noScroll = false }) => {
	return (
		<div className={`flex flex-col ${noScroll ? "h-screen overflow-hidden" : "min-h-screen"} overflow-x-hidden`}>
			<NavBar />
			<main
				className={`mx-auto w-full max-w-7xl ${
					noScroll ? "flex-1 flex min-h-0" : "flex-1"
				} px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10`}
			>
				{children}
			</main>
			<ChatBubble />
		</div>
	);
};

export default MainLayout;