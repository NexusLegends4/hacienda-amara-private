import "./App.css";
import { createElement, lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "./utils/supabase";
import { clearChatData } from "./utils/chat-history";
import { hasStaffVerificationClaim } from "./utils/staff-auth";
import { isGmailAddress } from "./utils/contact-validation";
import { SessionContext } from "./contexts/SessionContext.jsx";
import PwaControls from "./components/PwaControls.jsx";

const MFA_PENDING_KEY = "hacienda_staff_mfa_pending";

const THEME_STORAGE_KEY = "theme";

// Isang wrapper para sa lahat ng page transitions (para hindi na paulit-ulit)
const MotionDiv = motion.div;
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const EditProfile = lazy(() => import("./pages/EditProfile.jsx"));
const ManageEvents = lazy(() => import("./pages/ManageEvents.jsx"));
const ManagePackages = lazy(() => import("./pages/ManagePackages.jsx"));
const ManageClients = lazy(() => import("./pages/ManageClients.jsx"));
const AdminReservations = lazy(() => import("./pages/AdminReservations.jsx"));
const Reviews = lazy(() => import("./pages/Reviews.jsx"));
const PostReview = lazy(() => import("./pages/PostReview.jsx"));
const ManageReviews = lazy(() => import("./pages/ManageReviews.jsx"));
const About = lazy(() => import("./components/About.jsx"));
const Rules = lazy(() => import("./pages/Rules.jsx"));
const ManageReservations = lazy(() => import("./pages/ManageReservations.jsx"));
const AdminNotifications = lazy(() => import("./pages/AdminNotifications.jsx"));
const ClientNotifications = lazy(() => import("./components/ClientNotifications.jsx"));
const CustomerNotificationAccess = lazy(() => import("./pages/CustomerNotificationAccess.jsx"));
const CustomerNotifications = lazy(() => import("./pages/CustomerNotifications.jsx"));
const AddEvent = lazy(() => import("./pages/AddEvent.jsx"));
const EditEvent = lazy(() => import("./pages/EditEvent.jsx"));
const EditPackage = lazy(() => import("./pages/EditPackage.jsx"));
const ViewEvent = lazy(() => import("./pages/ViewEvent.jsx"));
const ScanQr = lazy(() => import("./pages/ScanQr.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Events = lazy(() => import("./pages/Events.jsx"));
const Reservations = lazy(() => import("./pages/Reservations.jsx"));
const BookingQr = lazy(() => import("./pages/BookingQr.jsx"));
const RoomPricing = lazy(() => import("./pages/RoomPricing.jsx"));
const FacebookQr = lazy(() => import("./pages/FacebookQr.jsx"));
const ManageAnnouncements = lazy(() => import("./pages/ManageAnnouncements.jsx"));
const BookingAnalytics = lazy(() => import("./pages/BookingAnalytics.jsx"));

function PageTransition({ children }) {
	return (
		<MotionDiv
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
		>
			{children}
		</MotionDiv>
	);
}

// Listahan ng routes: path + component
const routes = [
	{ path: "/", Component: HomePage },
	{ path: "/log-in", Component: Login },
	{ path: "/forgot-password", Component: ForgotPassword },
	{ path: "/reset-password", Component: ResetPassword },
	{ path: "/auth/callback", Component: AuthCallback },
	{ path: "/profile", Component: Profile },
	{ path: "/edit-profile", Component: EditProfile },
	{ path: "/manage-events", Component: ManageEvents },
	{ path: "/manage-packages", Component: ManagePackages },
	{ path: "/manage-clients", Component: ManageClients },
	{ path: "/admin-reservations", Component: AdminReservations },
	{ path: "/reviews", Component: Reviews },
	{ path: "/post-review", Component: PostReview },
	{ path: "/manage-reviews", Component: ManageReviews },
	{ path: "/about", Component: About },
	{ path: "/rules", Component: Rules },
	{ path: "/manage-reservations", Component: ManageReservations },
	{ path: "/admin-notifications", Component: AdminNotifications },
	{ path: "/client-notifications", Component: ClientNotifications },
	{ path: "/customer-notifications", Component: CustomerNotificationAccess },
	{
		path: "/customer-notifications/:reservationToken",
		Component: CustomerNotifications,
	},
	{ path: "/add-event", Component: AddEvent },
	{ path: "/edit-event/:eventId", Component: EditEvent },
	{ path: "/edit-package", Component: EditPackage },
	{ path: "/edit-package/:packageId", Component: EditPackage },
	{ path: "/view-event/:eventId", Component: ViewEvent },
	{ path: "/scan-qr", Component: ScanQr },
	{ path: "/settings", Component: Settings },
	{ path: "/events", Component: Events },
	{ path: "/rooms", Component: Reservations },
	{ path: "/booking-qr", Component: BookingQr },
	{ path: "/room-pricing", Component: RoomPricing },
	{ path: "/facebook-qr", Component: FacebookQr },
	{ path: "/manage-announcements", Component: ManageAnnouncements },
	{ path: "/booking-analytics", Component: BookingAnalytics },
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
			if (event === "PASSWORD_RECOVERY") {
				if (nextSession) {
					setSession(nextSession);
				}
				navigate("/reset-password");
			} else if (event === "SIGNED_OUT") {
				setSession(null);
				setProfile(null);
				localStorage.removeItem(MFA_PENDING_KEY);
			} else if (nextSession) {
				setSession(nextSession);
				setProfile((currentProfile) =>
					currentProfile?.id === nextSession.user.id ? currentProfile : null,
				);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [navigate]);

	useEffect(() => {
		// Clear pending email-OTP state left behind by the retired login flow.
		localStorage.removeItem("otp_pending");
	}, []);

	// Keep staff and admins in the verification flow until TOTP or email OTP succeeds.
	useEffect(() => {
		const mfaPending = localStorage.getItem(MFA_PENDING_KEY) === "true";
		const isLoginPage = location.pathname === "/log-in";

		if (session && mfaPending && !isLoginPage) {
			navigate("/log-in?oauth=true", { replace: true });
		}
	}, [session, location.pathname, navigate]);

	useEffect(() => {
		if (!session || session.user.is_anonymous || isGmailAddress(session.user.email)) return;

		const rejectNonGmailSession = async () => {
			console.error("Signing out an account that does not use a Gmail address.");
			const { error } = await supabase.auth.signOut();
			if (error) console.error("Unable to sign out a non-Gmail account:", error);
			alert("Only @gmail.com accounts can use this system. Please sign in with a Gmail account.");
		};

		void rejectNonGmailSession();
	}, [session]);

	useEffect(() => {
		if (
			!session ||
			!profile ||
			profile.id !== session.user.id ||
			!["staff", "admin"].includes(profile.role) ||
			["/log-in", "/auth/callback", "/reset-password"].includes(location.pathname)
		) {
			return;
		}

		let cancelled = false;
		const requireStaffVerification = async () => {
			const { data, error } =
				await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
			if (cancelled) return;

			if (error) {
				console.error("Unable to check staff assurance level:", error);
			}

			if (hasStaffVerificationClaim(session.access_token)) return;

			if (error || data.currentLevel !== "aal2") {
				localStorage.setItem(MFA_PENDING_KEY, "true");
				navigate("/log-in?oauth=true", { replace: true });
			}
		};

		requireStaffVerification();
		return () => {
			cancelled = true;
		};
	}, [session, profile, location.pathname, navigate]);

	useEffect(() => {
		if (
			!session ||
			profile?.role !== "client" ||
			["/log-in", "/auth/callback", "/reset-password", "/edit-profile"].includes(location.pathname)
		) {
			return;
		}

		const profileNeedsDetails = !profile.firstname?.trim()
			|| !profile.lastname?.trim()
			|| !profile.contact_number?.trim();
		if (profileNeedsDetails) {
			navigate("/edit-profile", { replace: true });
		}
	}, [session, profile, location.pathname, navigate]);

	// Profile
	useEffect(() => {
		if (!session || session.user.is_anonymous) return;

		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("id, firstname, lastname, email, contact_number, avatar_url, role, deleted_at")
				.eq("id", session.user.id)
				.single();

			if (error) alert(error.message);
			if (data) {
				if (data.deleted_at) {
					alert(
						"This account has been deleted. Please contact the administrator.",
					);
					try {
						await clearChatData(data);
					} catch (chatError) {
						console.error("Unable to clear chat history for deleted account:", chatError);
						alert("Chat history could not be deleted: " + chatError.message);
					}
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
				<PwaControls />
				<Routes location={location} key={location.pathname}>
					{routes.map(({ path, Component }) => (
						<Route
							key={path}
							path={path}
							element={
								<Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page"><span className="loading loading-spinner loading-lg text-primary" /></div>}>
									<PageTransition>{createElement(Component)}</PageTransition>
								</Suspense>
							}
						/>
					))}
				</Routes>
			</AnimatePresence>
		</SessionContext.Provider>
	);
}

export default App;
