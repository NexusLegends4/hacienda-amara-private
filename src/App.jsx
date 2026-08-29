import "./App.css";
import BookingQr from "./pages/BookingQr.jsx";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";
import { SessionContext } from "./contexts/SessionContext.jsx";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ManageEvents from "./pages/ManageEvents";
import ManageClients from "./pages/ManageClients";
import AdminNotifications from "./pages/AdminNotifications";
import AddEvent from "./pages/AddEvent";
import EditEvent from "./pages/EditEvent";
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
import SecurityCheck from "./pages/SecurityCheck";

const THEME_STORAGE_KEY = "theme";

function App() {
	const [session, setSession] = useState(null);
	const [profile, setProfile] = useState(null);

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

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, nextSession) => {
			console.log("event", event);
			console.log("session", nextSession);
			if (event === "SIGNED_OUT") {
				setSession(null);
				setProfile(null);
			} else if (nextSession) {
				setSession(nextSession);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("id, firstname, lastname, email, avatar_url, role, deleted_at")
				.eq("id", session.user.id)
				.single();

			if (error) alert(error);
			if (data) {
				if (data.deleted_at) {
					alert("This account has been deleted. Please contact the administrator.");
					await supabase.auth.signOut();
					return;
				}

				setProfile(data);
			}
		};

		if (session) {
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
		}
	}, [session, setProfile]);

	useEffect(() => {
		if (session && profile) {
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
		}
	}, [session, profile]);

	return (
		<SessionContext.Provider value={{ session, profile, setSession, setProfile }}>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/log-in" element={<Login />} />
				<Route path="/security-check" element={<SecurityCheck />} />
				<Route path="/profile" element={<Profile />} />
				<Route path="/edit-profile" element={<EditProfile />} />
				<Route path="/manage-events" element={<ManageEvents />} />
				<Route path="/manage-clients" element={<ManageClients />} />
				<Route path="/admin-reservations" element={<AdminReservations />} />
				<Route path="/reviews" element={<Reviews />} />
				<Route path="/post-review" element={<PostReview />} />
				<Route path="/manage-reviews" element={<ManageReviews />} />
				<Route path="/about" element={<About />} />
				<Route path="/rules" element={<Rules />} />
				<Route path="/manage-reservations" element={<ManageReservations />} />
				<Route path="/admin-notifications" element={<AdminNotifications />} />
				<Route path="/client-notifications" element={<ClientNotifications />} />
				<Route path="/add-event" element={<AddEvent />} />
				<Route path="/edit-event/:eventId" element={<EditEvent />} />
				<Route path="/view-event/:eventId" element={<ViewEvent />} />
				<Route path="/scan-qr" element={<ScanQr />} />
				<Route path="/chat" element={<Chat />} />
				<Route path="/settings" element={<Settings />} />
				<Route path="/events" element={<Events />} />
				<Route path="/rooms" element={<Reservations />} />
				<Route path="/booking-qr" element={<BookingQr />} />
			</Routes>
		</SessionContext.Provider>
	);
}

export default App;
