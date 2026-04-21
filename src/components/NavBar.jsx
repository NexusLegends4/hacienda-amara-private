import React, { useCallback, useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import SignUpIcon from "./icons/SignUpIcon";
import HomeIcon from "./icons/HomeIcon";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";
import LoginIcon from "./icons/LoginIcon";
import { useNavigate } from "react-router-dom";
import { FiBell, FiHome, FiChevronDown } from "react-icons/fi";

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

	return (
		<div className="navbar relative z-50 overflow-visible border-b border-base-200 bg-base-100/90 shadow-sm backdrop-blur">
			<div className="flex w-full max-w-7xl mx-auto flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center">
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<div className="leading-tight">
							<div className="text-sm font-bold tracking-tight text-base-content sm:text-base md:text-lg">
								Hacienda Amara
							</div>
							<div className="hidden text-[0.65rem] uppercase tracking-[0.28em] text-base-content/55 sm:block md:text-xs">
								Private Resort and Events Place
							</div>
						</div>
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
					<NavLink to="/" className={navLinkClass}>
						<FiHome className="mr-1 text-sm" />
						Home
					</NavLink>
					<NavLink to="/about" className={navLinkClass}>
						About Us
					</NavLink>
					<NavLink to="/rules" className={navLinkClass}>
						Rules
					</NavLink>
					<NavLink to="/chat" className={navLinkClass}>
						Chat
					</NavLink>

					{!session && (
						<>
							<NavLink to="/sign-up" className={navLinkClass}>
								<SignUpIcon className="text-base" />
								Sign Up
							</NavLink>
							<NavLink to="/log-in" className={navLinkClass}>
								<LoginIcon className="text-lg" />
								Login
							</NavLink>
						</>
					)}

					{profile?.role === "admin" && (
						<>
							{/* Manage dropdown */}
							<div className="dropdown dropdown-bottom relative z-[999]">
								<div
									tabIndex={0}
									role="button"
									className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 border-base-300 bg-white/80 text-base-content hover:border-black hover:bg-base-200 cursor-pointer"
								>
									Manage
									<FiChevronDown />
								</div>
								<ul
									tabIndex={0}
									className="menu menu-sm dropdown-content z-[1000] mt-2 w-52 rounded-2xl border border-base-200 bg-base-100 p-2 shadow-2xl"
								>
									<li>
										<NavLink to="/manage-events" className="rounded-xl px-3 py-2 text-base-content hover:bg-base-200">
											Manage Events
										</NavLink>
									</li>
									<li>
										<NavLink to="/manage-clients" className="rounded-xl px-3 py-2 text-base-content hover:bg-base-200">
											Manage Clients
										</NavLink>
									</li>
									<li>
										<NavLink to="/manage-reservations" className="rounded-xl px-3 py-2 text-base-content hover:bg-base-200">
											Manage Reservations
										</NavLink>
									</li>
								</ul>
							</div>

							<NavLink to="/admin-reservations" className={navLinkClass}>
								Calendar
							</NavLink>
							<NavLink to="/booking-qr" className={navLinkClass}>
								Booking QR
							</NavLink>
							<NavLink to="/admin-notifications" className={navLinkClass}>
								Notifications
							</NavLink>
						</>
					)}

					{profile && profile.role !== "admin" && (
						<NavLink to="/events" className={navLinkClass}>
							Events
						</NavLink>
					)}

					{profile && profile.role !== "admin" && (
						<NavLink to="/rooms" className={navLinkClass}>
							Book Now
						</NavLink>
					)}

					{profile && profile.role !== "admin" && (
						<NavLink to="/client-notifications" className={navLinkClass}>
							<FiBell className="text-base" />
							Notifications
							{unreadNotificationsCount > 0 && (
								<span className="badge badge-error badge-xs ml-1">{unreadNotificationsCount}</span>
							)}
						</NavLink>
					)}

					{session && (
						<div className="dropdown dropdown-end dropdown-bottom relative z-[999]">
							<div
								tabIndex={0}
								role="button"
								className="btn btn-ghost btn-circle avatar border border-base-300 shadow-sm"
							>
								<div className="w-9 overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-xs font-bold text-slate-800 sm:w-10">
									{profile?.avatar_url ? (
										<img
											alt={displayName || profile?.email || "Profile avatar"}
											src={profile.avatar_url}
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
											{getInitials(displayName || profile?.email)}
										</div>
									)}
								</div>
							</div>
							<ul
								tabIndex="-1"
								className="menu menu-sm dropdown-content z-[1000] mt-4 w-56 rounded-2xl border border-base-200 bg-base-100 p-3 shadow-2xl"
							>
								<li>
									<NavLink
										to="/profile"
										className="justify-between rounded-xl px-3 py-2 text-base-content hover:bg-base-200"
									>
										Profile
										<span className="badge">New</span>
									</NavLink>
								</li>
								<li>
									<NavLink
										to="/settings"
										className="rounded-xl px-3 py-2 text-base-content hover:bg-base-200"
									>
										Settings
									</NavLink>
								</li>
								<li>
									<button
										className="btn btn-black btn-sm mt-2 w-full rounded-full border border-black text-white shadow-lg ring-2 ring-black/10 ring-offset-2 ring-offset-base-100"
										onClick={handleLogout}
									>
										Logout
									</button>
								</li>
							</ul>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default NavBar;