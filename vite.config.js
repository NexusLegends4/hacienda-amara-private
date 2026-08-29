import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg", "icons.svg"],
			manifest: {
				name: "Hacienda Amara",
				short_name: "Hacienda Amara",
				description:
					"Hacienda Amara Private Resort and Events Place — Book events, manage reservations, and stay connected.",
				theme_color: "#1a1a2e",
				background_color: "#ffffff",
				display: "standalone",
				scope: "/",
				start_url: "/",
				orientation: "portrait",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
						handler: "NetworkFirst",
						options: {
							cacheName: "supabase-cache",
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24,
							},
						},
					},
				],
			},
		}),
	],
	server: {
		host: "0.0.0.0",
		port: 5173,
	},
	preview: {
		host: "0.0.0.0",
		port: 4173,
	},
});
