import { Buffer } from "node:buffer";
import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const localAiChatApi = {
	name: "local-ai-chat-api",
	configureServer(server) {
		server.middlewares.use("/api/ai-chat", async (request, response) => {
			if (request.method !== "POST") {
				response.statusCode = 405;
				response.setHeader("Allow", "POST");
				response.end(JSON.stringify({ error: "Method not allowed." }));
				return;
			}

			try {
				const chunks = [];
				let requestBytes = 0;
				for await (const chunk of request) {
					requestBytes += chunk.length;
					if (requestBytes <= 16_384) chunks.push(chunk);
				}
				if (requestBytes > 16_384) {
					response.statusCode = 413;
					response.end(JSON.stringify({ error: "Chat request is too large." }));
					return;
				}

				const headers = new Headers();
				for (const name of ["content-type", "content-length", "x-forwarded-for", "x-real-ip"]) {
					const value = request.headers[name];
					if (typeof value === "string") headers.set(name, value);
				}
				const apiRequest = new Request(`http://${request.headers.host || "localhost"}${request.url}`, {
					method: "POST",
					headers,
					body: Buffer.concat(chunks),
				});
				const { POST } = await import("./api/ai-chat.js");
				const apiResponse = await POST(apiRequest);
				response.statusCode = apiResponse.status;
				apiResponse.headers.forEach((value, name) => response.setHeader(name, value));

				const reader = apiResponse.body?.getReader();
				if (!reader) {
					response.end();
					return;
				}
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					response.write(Buffer.from(value));
				}
				response.end();
			} catch (error) {
				console.error("Local AI chat API failed:", error);
				if (!response.headersSent) {
					response.statusCode = 500;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "AI chat is temporarily unavailable." }));
				} else {
					response.end();
				}
			}
		});
	},
	configurePreviewServer(server) {
		localAiChatApi.configureServer(server);
	},
};

const localChatMessageApi = {
	name: "local-chat-message-api",
	configureServer(server) {
		server.middlewares.use("/api/chat-message", async (request, response) => {
			if (request.method !== "POST") {
				response.statusCode = 405;
				response.setHeader("Allow", "POST");
				response.setHeader("Content-Type", "application/json");
				response.end(JSON.stringify({ error: "Method not allowed." }));
				return;
			}

			try {
				const chunks = [];
				let requestBytes = 0;
				for await (const chunk of request) {
					requestBytes += chunk.length;
					if (requestBytes <= 131_072) chunks.push(chunk);
				}
				if (requestBytes > 131_072) {
					response.statusCode = 413;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "Chat request is too large." }));
					return;
				}

				const headers = new Headers();
				for (const name of ["content-type", "authorization", "content-length", "x-forwarded-for", "x-real-ip"]) {
					const value = request.headers[name];
					if (typeof value === "string") headers.set(name, value);
				}
				const apiRequest = new Request(`http://${request.headers.host || "localhost"}${request.url}`, {
					method: "POST",
					headers,
					body: Buffer.concat(chunks),
				});
				const { POST } = await import("./api/chat-message.js");
				const apiResponse = await POST(apiRequest);
				response.statusCode = apiResponse.status;
				apiResponse.headers.forEach((value, name) => response.setHeader(name, value));
				response.end(Buffer.from(await apiResponse.arrayBuffer()));
			} catch (error) {
				console.error("Local chat message API failed:", error);
				if (!response.headersSent) {
					response.statusCode = 500;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "Your message could not be saved. Please try again." }));
				} else {
					response.end();
				}
			}
		});
	},
	configurePreviewServer(server) {
		localChatMessageApi.configureServer(server);
	},
};

const localBookingAnalyticsApi = {
	name: "local-booking-analytics-api",
	configureServer(server) {
		server.middlewares.use("/api/booking-analytics", async (request, response) => {
			if (request.method !== "POST") {
				response.statusCode = 405;
				response.setHeader("Allow", "POST");
				response.setHeader("Content-Type", "application/json");
				response.end(JSON.stringify({ error: "Method not allowed." }));
				return;
			}

			try {
				const headers = new Headers();
				for (const name of ["content-type", "authorization", "x-forwarded-for", "x-real-ip"]) {
					const value = request.headers[name];
					if (typeof value === "string") headers.set(name, value);
				}
				const apiRequest = new Request(`http://${request.headers.host || "localhost"}${request.url}`, {
					method: "POST",
					headers,
				});
				const { POST } = await import("./api/booking-analytics.js");
				const apiResponse = await POST(apiRequest);
				response.statusCode = apiResponse.status;
				apiResponse.headers.forEach((value, name) => response.setHeader(name, value));
				response.end(Buffer.from(await apiResponse.arrayBuffer()));
			} catch (error) {
				console.error("Local booking analytics API failed:", error);
				if (!response.headersSent) {
					response.statusCode = 500;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "Booking analytics is temporarily unavailable." }));
				} else {
					response.end();
				}
			}
		});
	},
	configurePreviewServer(server) {
		localBookingAnalyticsApi.configureServer(server);
	},
};

const localReservationStatusNotificationApi = {
	name: "local-reservation-status-notification-api",
	configureServer(server) {
		server.middlewares.use("/api/reservation-status-notification", async (request, response) => {
			if (request.method !== "POST") {
				response.statusCode = 405;
				response.setHeader("Allow", "POST");
				response.setHeader("Content-Type", "application/json");
				response.end(JSON.stringify({ error: "Method not allowed." }));
				return;
			}

			try {
				const chunks = [];
				let requestBytes = 0;
				for await (const chunk of request) {
					requestBytes += chunk.length;
					if (requestBytes <= 16_384) chunks.push(chunk);
				}
				if (requestBytes > 16_384) {
					response.statusCode = 413;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "Notification request is too large." }));
					return;
				}

				const headers = new Headers();
				for (const name of ["content-type", "authorization", "x-forwarded-for", "x-real-ip"]) {
					const value = request.headers[name];
					if (typeof value === "string") headers.set(name, value);
				}
				const apiRequest = new Request(`http://${request.headers.host || "localhost"}${request.url}`, {
					method: "POST",
					headers,
					body: Buffer.concat(chunks),
				});
				const { POST } = await import("./api/reservation-status-notification.js");
				const apiResponse = await POST(apiRequest);
				response.statusCode = apiResponse.status;
				apiResponse.headers.forEach((value, name) => response.setHeader(name, value));
				response.end(Buffer.from(await apiResponse.arrayBuffer()));
			} catch (error) {
				console.error("Local reservation notification API failed:", error);
				if (!response.headersSent) {
					response.statusCode = 500;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "Reservation notification could not be sent." }));
				} else {
					response.end();
				}
			}
		});
	},
	configurePreviewServer(server) {
		localReservationStatusNotificationApi.configureServer(server);
	},
};

const localChatMediaModerationApi = {
	name: "local-chat-media-moderation-api",
	configureServer(server) {
		server.middlewares.use("/api/chat-media-moderation", async (request, response) => {
			if (request.method !== "POST") {
				response.statusCode = 405;
				response.setHeader("Allow", "POST");
				response.setHeader("Content-Type", "application/json");
				response.end(JSON.stringify({ error: "Method not allowed." }));
				return;
			}

			try {
				const chunks = [];
				let requestBytes = 0;
				for await (const chunk of request) {
					requestBytes += chunk.length;
					if (requestBytes <= 1_500_000) chunks.push(chunk);
				}
				if (requestBytes > 1_500_000) {
					response.statusCode = 413;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "Media safety screening request is too large." }));
					return;
				}

				const headers = new Headers();
				for (const name of ["content-type", "authorization", "x-forwarded-for", "x-real-ip"]) {
					const value = request.headers[name];
					if (typeof value === "string") headers.set(name, value);
				}
				const apiRequest = new Request(`http://${request.headers.host || "localhost"}${request.url}`, {
					method: "POST",
					headers,
					body: Buffer.concat(chunks),
				});
				const { POST } = await import("./api/chat-media-moderation.js");
				const apiResponse = await POST(apiRequest);
				response.statusCode = apiResponse.status;
				apiResponse.headers.forEach((value, name) => response.setHeader(name, value));
				response.end(Buffer.from(await apiResponse.arrayBuffer()));
			} catch (error) {
				console.error("Local chat media moderation failed:", error);
				if (!response.headersSent) {
					response.statusCode = 500;
					response.setHeader("Content-Type", "application/json");
					response.end(JSON.stringify({ error: "Media safety screening is unavailable." }));
				} else {
					response.end();
				}
			}
		});
	},
	configurePreviewServer(server) {
		localChatMediaModerationApi.configureServer(server);
	},
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	if (!process.env.GROQ_API_KEY && env.GROQ_API_KEY) {
		process.env.GROQ_API_KEY = env.GROQ_API_KEY;
	}
	for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]) {
		if (!process.env[key] && env[key]) process.env[key] = env[key];
	}
	for (const key of ["GMAIL_USER", "GMAIL_APP_PASSWORD"]) {
		if (!process.env[key] && env[key]) process.env[key] = env[key];
	}
	if (!process.env.SUPABASE_URL && env.VITE_SUPABASE_URL) {
		process.env.SUPABASE_URL = env.VITE_SUPABASE_URL;
	}
	if (env.VITE_SUPABASE_ANON_KEY) {
		process.env.SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
	}

	return {
		define: {
			// Supabase's project URL is public client configuration. Support the
			// server-side SUPABASE_URL name used by this project as a build fallback.
			"import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
				env.VITE_SUPABASE_URL || env.SUPABASE_URL || "",
			),
		},
		optimizeDeps: {
			exclude: ["@ffmpeg/ffmpeg"],
		},
		plugins: [
			react(),
			tailwindcss(),
			localAiChatApi,
			localChatMessageApi,
			localBookingAnalyticsApi,
			localReservationStatusNotificationApi,
			localChatMediaModerationApi,
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
	};
});
