import React from "react";
import NavBar from "../components/NavBar";

const MainLayout = ({ children, noScroll = false }) => {
	return (
		<div className={`flex flex-col ${noScroll ? "h-screen overflow-hidden" : "min-h-screen"}`}>
			<NavBar />
			<main
				className={`mx-auto w-full max-w-7xl ${
					noScroll ? "flex-1 flex min-h-0" : "flex-1"
				} px-3 sm:px-4 md:px-6`}
			>
				{children}
			</main>
		</div>
	);
};

export default MainLayout;