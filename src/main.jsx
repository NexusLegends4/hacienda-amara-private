import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react"; // Note: Use the /react subpath
import App from './App'; // Or your main router component

const THEME_STORAGE_KEY = "theme";

const applyTheme = () => {
	const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const theme = savedTheme === "system" ? (prefersDark ? "dark" : "light") : savedTheme;

	document.documentElement.setAttribute("data-theme", theme);
	document.documentElement.style.colorScheme = theme;
};

applyTheme();

// Mount the React app inside the browser router so pages can navigate cleanly.
ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
	<BrowserRouter>
		<App />
		<SpeedInsights />
	</BrowserRouter>
	</React.StrictMode>
);
