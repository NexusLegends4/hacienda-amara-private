import "./App.css";
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "./utils/supabase";
import { SessionContext } from "./contexts/SessionContext.jsx";

import BookingQr from "./pages/BookingQr.jsx";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ManageEvents from "./pages/ManageEvents";
import ManageClients from "./pages/ManageClients";
import ManagePackages from "./pages/ManagePackages";
import AdminNotifications from "./pages/AdminNotifications";
import AddEvent from "./pages/AddEvent";
import EditEvent from "./pages/EditEvent";
import EditPackage from "./pages/EditPackage";
import Events from "./pages/Events";
import ViewEvent from "./pages/ViewEvent";
import Settings from "./pages/Settings";
import ScanQr from "./pages/ScanQr";
import Chat from "./pages/Chat";
import Reservations from "./pages/Reservations";
import AdminReservations from "./pages/AdminReservations";
import ManageReservations from "./pages/ManageReservations";
import ManageReviews from "./pages/ManageReviews";
import About from "./components/About";
import ClientNotifications from "./components/ClientNotifications";
import Reviews from "./pages/Reviews";
import PostReview from "./pages/PostReview";
import Rules from "./pages/Rules";
import CustomerNotifications from "./pages/CustomerNotifications";
import CustomerNotificationAccess from "./pages/CustomerNotificationAccess";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";

const THEME_STORAGE_KEY = "theme";

// Isang wrapper para sa lahat ng page transitions (para hindi na paulit-ulit)
function PageTransition({ children }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	);
}

// Listahan ng routes: path + component
const routes = [
	{ path: "/", element: <HomePage /> },
	{ path: "/log-in", element: <Login /> },
	{ path: "/forgot-password", element: <ForgotPassword /> },
	{ path: "/reset-password", element: <ResetPassword /> },
	{ path: "/auth/callback", element: <AuthCallback /> },
	{ path: "/profile", element: <Profile /> },
	{ path: "/edit-profile", element: <EditProfile /> },
	{ path: "/manage-events", element: <ManageEvents /> },
	{ path: "/manage-packages", element: <ManagePackages /> },
	{ path: "/manage-clients", element: <ManageClients /> },
	{ path: "/admin-reservations", element: <AdminReservations /> },
	{ path: "/reviews", element: <Reviews /> },
	{ path: "/post-review", element: <PostReview /> },
	{ path: "/manage-reviews", element: <ManageReviews /> },
	{ path: "/about", element: <About /> },
	{ path: "/rules", element: <Rules /> },
	{ path: "/manage-reservations", element: <ManageReservations /> },
	{ path: "/admin-notifications", element: <AdminNotifications /> },
	{ path: "/client-notifications", element: <ClientNotifications /> },
	{ path: "/customer-notifications", element: <CustomerNotificationAccess /> },
	{
		path: "/customer-notifications/:reservationToken",
		element: <CustomerNotifications />,
	},
	{ path: "/add-event", element: <AddEvent /> },
	{ path: "/edit-event/:eventId", element: <EditEvent /> },
	{ path: "/edit-package", element: <EditPackage /> },
	{ path: "/edit-package/:packageId", element: <EditPackage /> },
	{ path: "/view-event/:eventId", element: <ViewEvent /> },
	{ path: "/scan-qr", element: <ScanQr /> },
	{ path: "/chat", element: <Chat /> },
	{ path: "/settings", element: <Settings /> },
	{ path: "/events", element: <Events /> },
	{ path: "/rooms", element: <Reservations /> },
	{ path: "/booking-qr", element: <BookingQr /> },
];

function App() {
	const [session, setSession] = useState(null);
	const [profile, setProfile] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();

	// Theme
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const applyTheme = () => {
			const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
			const effectiveTheme =
				savedTheme === "system"
					? mediaQuery.matches
						? "dark"
						: "light"
					: savedTheme;

			document.documentElement.setAttribute("data-theme", effectiveTheme);
			document.documentElement.style.colorScheme = effectiveTheme;
		};

		const handleThemeChange = () => {
			const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "system";
			if (savedTheme === "system") {
				applyTheme();
			}
		};

		applyTheme();

		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", handleThemeChange);
		} else {
			mediaQuery.addListener(handleThemeChange);
		}

		window.addEventListener("storage", applyTheme);

		return () => {
			if (mediaQuery.removeEventListener) {
				mediaQuery.removeEventListener("change", handleThemeChange);
			} else {
				mediaQuery.removeListener(handleThemeChange);
			}

			window.removeEventListener("storage", applyTheme);
		};
	}, []);

	// Auth state
	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, nextSession) => {
			console.log("event", event);
			console.log("session", nextSession);
			if (event === "PASSWORD_RECOVERY") {
				if (nextSession) {
					setSession(nextSession);
				}
				navigate("/reset-password");
			} else if (event === "SIGNED_OUT") {
				setSession(null);
				setProfile(null);
			} else if (nextSession) {
				setSession(nextSession);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [navigate]);

	// Profile
	useEffect(() => {
		if (!session) return;

		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("id, firstname, lastname, email, avatar_url, role, deleted_at")
				.eq("id", session.user.id)
				.single();

			if (error) alert(error.message);
			if (data) {
				if (data.deleted_at) {
					alert(
						"This account has been deleted. Please contact the administrator.",
					);
					await supabase.auth.signOut();
					return;
				}

				setProfile(data);
			}
		};

		fetchProfile();

		const profileChannel = supabase
			.channel(`self-profile-${session.user.id}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "profiles",
					filter: `id=eq.${session.user.id}`,
				},
				(payload) => {
					console.log("Profile updated live:", payload.new);
					setProfile(payload.new);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(profileChannel);
		};
	}, [session]);

	// Notifications
	useEffect(() => {
		if (!session || !profile) return;

		const channel = supabase
			.channel(`user-notifs-${session.user.id}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "notifications",
					filter: `profile_id=eq.${session.user.id}`,
				},
				(payload) => {
					alert(`Notification: ${payload.new.message}`);
				},
			)
			.subscribe();

		let adminChannel = null;
		if (["admin", "staff"].includes(profile?.role)) {
			adminChannel = supabase
				.channel("admin-global-activity")
				.on(
					"postgres_changes",
					{
						event: "INSERT",
						schema: "public",
						table: "auth_notifications",
					},
					(payload) => {
						if (payload.new.event_type === "booking") {
							alert(
								`New booking: ${payload.new.actor_name || payload.new.actor_email || "A client"} submitted a reservation.`,
							);
						}
					},
				)
				.subscribe();
		}

		return () => {
			supabase.removeChannel(channel);
			if (adminChannel) supabase.removeChannel(adminChannel);
		};
	}, [session, profile]);

	return (
		<SessionContext.Provider
			value={{ session, profile, setSession, setProfile }}
		>
			<AnimatePresence mode="wait">
				<Routes location={location} key={location.pathname}>
					{routes.map(({ path, element }) => (
						<Route
							key={path}
							path={path}
							element={<PageTransition>{element}</PageTransition>}
						/>
					))}
				</Routes>
			</AnimatePresence>
		</SessionContext.Provider>
	);
}

export default App;
