import React, { useCallback, useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";
import LoginIcon from "./icons/LoginIcon";
import { useNavigate } from "react-router-dom";
import { FiBell, FiHome, FiChevronDown, FiMenu, FiX } from "react-icons/fi";

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const NavBar = () => {
	const { session, profile, setSession, setProfile } = useContext(SessionContext);
	const navigate = useNavigate();
	const displayName = [profile?.firstname, profile?.lastname].filter(Boolean).join(" ").trim();
	const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
	const [mobileOpen, setMobileOpen] = useState(false);

	const fetchUnreadCount = useCallback(async () => {
		if (!profile?.id) return;
		const { count, error } = await supabase
			.from("notifications")
			.select("*", { count: "exact", head: true })
			.eq("profile_id", profile.id)
			.eq("is_read", false);

		if (!error) setUnreadNotificationsCount(count || 0);
	}, [profile?.id]);

	useEffect(() => {
		if (profile?.id && profile.role !== "admin") {
			fetchUnreadCount();

			const channel = supabase
				.channel(`unread_count_${profile.id}`)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "notifications",
						filter: `profile_id=eq.${profile.id}`,
					},
					() => fetchUnreadCount()
				)
				.subscribe();

			return () => {
				supabase.removeChannel(channel);
			};
		}
	}, [profile, fetchUnreadCount]);

	const navLinkClass = ({ isActive }) =>
		[
			"inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
			isActive
				? "border-black bg-black text-white shadow-md"
				: "border-base-300 bg-white/80 text-base-content hover:border-black hover:bg-base-200",
		].join(" ");

	const mobileLinkClass = ({ isActive }) =>
		[
			"flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
			isActive
				? "bg-black text-white"
				: "text-base-content hover:bg-base-200",
		].join(" ");

	const handleLogout = async () => {
		if (profile?.id) {
			await supabase
				.from("profiles")
				.update({
					status: "offline",
					last_seen: new Date().toISOString()
				})
				.eq("id", profile.id);

			await supabase
				.from("auth_notifications")
				.insert({
					event_type: "logout",
					actor_profile_id: profile.id,
					actor_name: displayName,
					actor_email: profile.email || "",
					actor_role: profile.role || "client"
				});
		}

		const { error } = await supabase.auth.signOut();
		if (error) alert("Error logging out: " + error.message);

		setSession(null);
		setProfile(null);
		setMobileOpen(false);
		navigate("/");
	};

	useEffect(() => {
		if (session && profile?.id) {
			const updateActivity = async () => {
				await supabase
					.from("profiles")
					.update({
						status: "online",
						last_seen: new Date().toISOString()
					})
					.eq("id", profile.id);
			};
			updateActivity();
		}
	}, [session, profile?.id]);

	useEffect(() => {
		setMobileOpen(false);
	}, [navigate]);

	const closeMobile = () => setMobileOpen(false);

	return (
		<>
			<div className="navbar relative z-50 overflow-visible border-b border-base-200 bg-base-100/90 shadow-sm backdrop-blur">
				<div className="flex w-full max-w-7xl mx-auto items-center px-3 py-3 sm:px-4">
					{/* Brand */}
					<div className="flex-1">
						<div className="leading-tight">
							<div className="text-sm font-bold tracking-tight text-base-content sm:text-base md:text-lg">
								Hacienda Amara
							</div>
							<div className="hidden text-[0.65rem] uppercase tracking-[0.28em] text-base-content/55 sm:block md:text-xs">
								Private Resort and Events Place
							</div>
						</div>
					</div>

					{/* Desktop nav */}
					<div className="hidden lg:flex flex-wrap items-center gap-2">
						<NavLink to="/" className={navLinkClass}>
							<FiHome className="text-sm" /> Home
						</NavLink>
						<NavLink to="/about" className={navLinkClass}>About Us</NavLink>
						<NavLink to="/rules" className={navLinkClass}>Rules</NavLink>
						<NavLink to="/chat" className={navLinkClass}>Chat</NavLink>

						{!session && (
							<>
								<NavLink to="/rooms" className={navLinkClass}>Book Now</NavLink>
								<NavLink to="/log-in" className={navLinkClass}>
									<LoginIcon className="text-lg" /> Login
								</NavLink>
							</>
						)}

						{profile?.role === "admin" && (
							<>
								<div className="dropdown dropdown-bottom relative z-[999]">
									<div tabIndex={0} role="button" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 border-base-300 bg-white/80 text-base-content hover:border-black hover:bg-base-200 cursor-pointer">
										Manage <FiChevronDown />
									</div>
									<ul tabIndex={0} className="menu menu-sm dropdown-content z-[1000] mt-2 w-52 rounded-2xl border border-base-200 bg-base-100 p-2 shadow-2xl">
										<li><NavLink to="/manage-events" className="rounded-xl px-3 py-2 hover:bg-base-200">Manage Events</NavLink></li>
										<li><NavLink to="/manage-clients" className="rounded-xl px-3 py-2 hover:bg-base-200">Manage Clients</NavLink></li>
										<li><NavLink to="/manage-reservations" className="rounded-xl px-3 py-2 hover:bg-base-200">Manage Reservations</NavLink></li>
										<li><NavLink to="/scan-qr" className="rounded-xl px-3 py-2 hover:bg-base-200">Scan QR</NavLink></li>
									</ul>
								</div>
								<NavLink to="/admin-reservations" className={navLinkClass}>Calendar</NavLink>
								<NavLink to="/booking-qr" className={navLinkClass}>Booking QR</NavLink>
								<NavLink to="/admin-notifications" className={navLinkClass}>Notifications</NavLink>
							</>
						)}

						{profile?.role === "staff" && (
							<NavLink to="/manage-reservations" className={navLinkClass}>Reservations</NavLink>
						)}

						{profile && profile.role !== "admin" && (
							<>
								<NavLink to="/events" className={navLinkClass}>Events</NavLink>
								<NavLink to="/scan-qr" className={navLinkClass}>Scan QR</NavLink>
								<NavLink to="/rooms" className={navLinkClass}>Book Now</NavLink>
								<NavLink to="/client-notifications" className={navLinkClass}>
									<FiBell className="text-base" />
									Notifications
									{unreadNotificationsCount > 0 && (
										<span className="badge badge-error badge-xs ml-1">{unreadNotificationsCount}</span>
									)}
								</NavLink>
							</>
						)}

						{session && (
							<div className="dropdown dropdown-end dropdown-bottom relative z-[999]">
								<div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar border border-base-300 shadow-sm">
									<div className="w-9 overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-xs font-bold text-slate-800 sm:w-10">
										{profile?.avatar_url ? (
											<img alt={displayName || profile?.email || "avatar"} src={profile.avatar_url} className="h-full w-full object-cover" />
										) : (
											<div className="flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
												{getInitials(displayName || profile?.email)}
											</div>
										)}
									</div>
								</div>
								<ul tabIndex="-1" className="menu menu-sm dropdown-content z-[1000] mt-4 w-56 rounded-2xl border border-base-200 bg-base-100 p-3 shadow-2xl">
									<li><NavLink to="/profile" className="justify-between rounded-xl px-3 py-2 hover:bg-base-200">Profile <span className="badge">New</span></NavLink></li>
									<li><NavLink to="/settings" className="rounded-xl px-3 py-2 hover:bg-base-200">Settings</NavLink></li>
									<li>
										<button className="btn btn-black btn-sm mt-2 w-full rounded-full border border-black text-white shadow-lg ring-2 ring-black/10 ring-offset-2 ring-offset-base-100" onClick={handleLogout}>
											Logout
										</button>
									</li>
								</ul>
							</div>
						)}
					</div>

					{/* Mobile right side */}
					<div className="flex lg:hidden items-center gap-2">
						{session && (
							<div className="relative">
								<div
									onClick={() => { navigate("/client-notifications"); }}
									className="relative cursor-pointer"
								>
									{profile && profile.role !== "admin" && unreadNotificationsCount > 0 && (
										<span className="badge badge-error badge-xs absolute -top-1 -right-1 z-10">{unreadNotificationsCount}</span>
									)}
								</div>
							</div>
						)}
						<button
							onClick={() => setMobileOpen(!mobileOpen)}
							className="btn btn-ghost btn-circle border border-base-300"
						>
							{mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile menu overlay */}
			{mobileOpen && (
				<div className="fixed inset-0 z-40 lg:hidden">
					<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeMobile} />

					<div className="absolute top-0 right-0 h-full w-72 bg-base-100 shadow-2xl flex flex-col overflow-y-auto">
						<div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
							<div>
								<p className="font-bold text-base-content">Hacienda Amara</p>
								<p className="text-[0.65rem] uppercase tracking-widest text-base-content/50">Menu</p>
							</div>
							<button onClick={closeMobile} className="btn btn-ghost btn-circle btn-sm">
								<FiX className="text-lg" />
							</button>
						</div>

						{session && (
							<div className="flex items-center gap-3 px-5 py-4 border-b border-base-200 bg-base-200/40">
								<div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center text-xs font-bold text-slate-800 shrink-0">
									{profile?.avatar_url ? (
										<img src={profile.avatar_url} className="h-full w-full object-cover" alt="avatar" />
									) : (
										getInitials(displayName || profile?.email)
									)}
								</div>
								<div className="min-w-0">
									<p className="font-bold text-sm truncate">{displayName || profile?.email}</p>
									<p className="text-xs text-base-content/50 capitalize">{profile?.role}</p>
								</div>
							</div>
						)}

						<nav className="flex flex-col gap-1 p-4 flex-1">
							<NavLink to="/" className={mobileLinkClass} onClick={closeMobile}>
								<FiHome /> Home
							</NavLink>
							<NavLink to="/about" className={mobileLinkClass} onClick={closeMobile}>About Us</NavLink>
							<NavLink to="/rules" className={mobileLinkClass} onClick={closeMobile}>Rules</NavLink>
							<NavLink to="/chat" className={mobileLinkClass} onClick={closeMobile}>Chat</NavLink>

							{!session && (
								<>
									<div className="border-t border-base-200 my-2" />
									<NavLink to="/rooms" className={mobileLinkClass} onClick={closeMobile}>Book Now</NavLink>
									<NavLink to="/log-in" className={mobileLinkClass} onClick={closeMobile}>
										<LoginIcon /> Login
									</NavLink>
								</>
							)}

							{profile?.role === "admin" && (
								<>
									<div className="border-t border-base-200 my-2" />
									<p className="text-[0.65rem] uppercase tracking-widest text-base-content/40 px-4 py-1">Manage</p>
									<NavLink to="/manage-events" className={mobileLinkClass} onClick={closeMobile}>Manage Events</NavLink>
									<NavLink to="/manage-clients" className={mobileLinkClass} onClick={closeMobile}>Manage Clients</NavLink>
									<NavLink to="/manage-reservations" className={mobileLinkClass} onClick={closeMobile}>Manage Reservations</NavLink>
									<NavLink to="/scan-qr" className={mobileLinkClass} onClick={closeMobile}>Scan QR</NavLink>
									<div className="border-t border-base-200 my-2" />
									<NavLink to="/admin-reservations" className={mobileLinkClass} onClick={closeMobile}>Calendar</NavLink>
									<NavLink to="/booking-qr" className={mobileLinkClass} onClick={closeMobile}>Booking QR</NavLink>
									<NavLink to="/admin-notifications" className={mobileLinkClass} onClick={closeMobile}>Notifications</NavLink>
								</>
							)}

							{profile?.role === "staff" && (
								<>
									<div className="border-t border-base-200 my-2" />
									<NavLink to="/manage-reservations" className={mobileLinkClass} onClick={closeMobile}>Reservations</NavLink>
								</>
							)}

							{profile && profile.role !== "admin" && (
								<>
									<div className="border-t border-base-200 my-2" />
									<NavLink to="/events" className={mobileLinkClass} onClick={closeMobile}>Events</NavLink>
									<NavLink to="/scan-qr" className={mobileLinkClass} onClick={closeMobile}>Scan QR</NavLink>
									<NavLink to="/rooms" className={mobileLinkClass} onClick={closeMobile}>Book Now</NavLink>
									<NavLink to="/client-notifications" className={mobileLinkClass} onClick={closeMobile}>
										<FiBell />
										Notifications
										{unreadNotificationsCount > 0 && (
											<span className="badge badge-error badge-xs ml-1">{unreadNotificationsCount}</span>
										)}
									</NavLink>
								</>
							)}

							{session && (
								<>
									<div className="border-t border-base-200 my-2" />
									<NavLink to="/profile" className={mobileLinkClass} onClick={closeMobile}>Profile</NavLink>
									<NavLink to="/settings" className={mobileLinkClass} onClick={closeMobile}>Settings</NavLink>
									<button
										onClick={handleLogout}
										className="mt-2 btn btn-black w-full rounded-full text-white"
									>
										Logout
									</button>
								</>
							)}
						</nav>
					</div>
				</div>
			)}
		</>
	);
};

export default NavBar;
