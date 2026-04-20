import React from "react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

const MainLayout = ({ children }) => {
	return (
		// Shared page shell used by most screens.
		<div className="flex flex-col min-h-screen">
			<NavBar />
			<main className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-4 md:px-6">
				{children}
			</main>
			<Footer />
		</div>
	);
};

export default MainLayout;
