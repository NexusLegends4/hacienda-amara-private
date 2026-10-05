import { AnimatePresence, motion } from "framer-motion";
import "./App.css";
import BookingQr from "./pages/BookingQr.jsx";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./utils/supabase";
import { SessionContext } from "./contexts/SessionContext.jsx";
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

function App() {
 	const [session, setSession] = useState(null);
 	const [profile, setProfile] = useState(null);
	const navigate = useNavigate();

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
	}, [session, setProfile, navigate]);

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
			<AnimatePresence mode="wait">
				<Routes>
					<Route path="/" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						>
							<HomePage />
						</motion.div>
					} />
					<Route path="/log-in" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						>
							<Login />
						</motion.div>
					} />
					<Route path="/forgot-password" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						>
							<ForgotPassword />
						</motion.div>
					} />
					<Route path="/reset-password" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}>
							<ResetPassword />
						</motion.div>
					} />
					<Route path="/auth/callback" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}>
							<AuthCallback />
						</motion.div>
					} />
							<AuthCallback />
						</motion.div>
					} />
					<Route path="/profile" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						>
							<Profile />
						</motion.div>
					} />
					<Route path="/edit-profile" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <EditProfile /> </motion.div>
					} />
					<Route path="/manage-events" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ManageEvents /> </motion.div>
					} />
					<Route path="/manage-packages" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ManagePackages /> </motion.div>
					} />
					<Route path="/manage-clients" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ManageClients /> </motion.div>
					} />
					<Route path="/admin-reservations" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <AdminReservations /> </motion.div>
					} />
					<Route path="/reviews" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <Reviews /> </motion.div>
					} />
					<Route path="/post-review" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <PostReview /> </motion.div>
					} />
					<Route path="/manage-reviews" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ManageReviews /> </motion.div>
					} />
					<Route path="/about" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <About /> </motion.div>
					} />
					<Route path="/rules" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <Rules /> </motion.div>
					} />
					<Route path="/manage-reservations" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ManageReservations /> </motion.div>
					} />
					<Route path="/admin-notifications" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <AdminNotifications /> </motion.div>
					} />
					<Route path="/client-notifications" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ClientNotifications /> </motion.div>
					} />
					<Route path="/customer-notifications" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <CustomerNotificationAccess /> </motion.div>
					} />
					<Route path="/customer-notifications/:reservationToken" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <CustomerNotifications /> </motion.div>
					} />
					<Route path="/add-event" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <AddEvent /> </motion.div>
					} />
					<Route path="/edit-event/:eventId" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <EditEvent /> </motion.div>
					} />
					<Route path="/edit-package" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <EditPackage /> </motion.div>
					} />
					<Route path="/edit-package/:packageId" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <EditPackage /> </motion.div>
					} />
					<Route path="/view-event/:eventId" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ViewEvent /> </motion.div>
					} />
					<Route path="/scan-qr" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <ScanQr /> </motion.div>
					} />
					<Route path="/chat" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <Chat /> </motion.div>
					} />
					<Route path="/settings" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <Settings /> </motion.div>
					} />
					<Route path="/events" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <Events /> </motion.div>
					} />
					<Route path="/rooms" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <Reservations /> </motion.div>
					} />
					<Route path="/booking-qr" element={
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeOut" }}
						}
						> <BookingQr /> </motion.div>
					} />
				</Routes>
			</AnimatePresence>
		</SessionContext.Provider>
	);
}

export default App;
