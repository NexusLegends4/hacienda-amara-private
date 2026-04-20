import React, { useContext, useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import { FiBell, FiClock, FiLogIn, FiLogOut, FiRefreshCw, FiTrash2, FiUserPlus, FiCalendar } from "react-icons/fi";

const formatDateTime = (value) => {
	if (!value) return "Unknown time";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown time";

	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
	}).format(date);
};

const AdminNotifications = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [clearing, setClearing] = useState(false);

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}

		if (profile && profile.role !== "admin") {
			navigate("/");
		}
	}, [session, profile, navigate]);

	const loadNotifications = async () => {
		setRefreshing(true);
		const { data, error } = await supabase
			.from("auth_notifications")
			.select("id, event_type, actor_profile_id, actor_name, actor_email, created_at")
			.order("created_at", { ascending: false });

		if (error) {
			alert(error.message || error);
			setRefreshing(false);
			setLoading(false);
			return;
		}

		setNotifications(data || []);
		setRefreshing(false);
		setLoading(false);
	};

	const clearNotifications = async () => {
		const confirmed = window.confirm("Clear all auth notifications?");
		if (!confirmed) return;

		setClearing(true);
		const { error } = await supabase
			.from("auth_notifications")
			.delete()
			.gte("created_at", "1970-01-01T00:00:00Z");

		if (error) {
			alert(error.message || error);
			setClearing(false);
			return;
		}

		setNotifications([]);
		setClearing(false);
	};

	useEffect(() => {
		if (profile?.role !== "admin") return;

		void loadNotifications();
	}, [profile?.role]);

	useEffect(() => {
		if (profile?.role !== "admin") return undefined;

		const channel = supabase.channel("auth-notifications-live");

		channel.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "auth_notifications",
			},
			({ new: row }) => {
				if (!row?.id) return;

				setNotifications((current) => {
					if (current.some((item) => item.id === row.id)) {
						return current;
					}

					return [row, ...current].sort(
						(left, right) =>
							new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
					);
				});
			},
		);

		channel.on(
			"postgres_changes",
			{
				event: "DELETE",
				schema: "public",
				table: "auth_notifications",
			},
			({ old: row }) => {
				if (!row?.id) return;

				setNotifications((current) => current.filter((item) => item.id !== row.id));
			},
		);

		channel.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [profile?.role]);

	const counts = useMemo(
		() => ({
			total: notifications.length,
			logins: notifications.filter((item) => item.event_type === "login").length,
			signups: notifications.filter((item) => item.event_type === "signup").length,
			logouts: notifications.filter((item) => item.event_type === "logout").length,
			bookings: notifications.filter((item) => item.event_type === "booking").length,
		}),
		[notifications],
	);

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.75rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
							<div className="max-w-2xl">
								<p className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/50">
									Admin Notifications
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-5xl">
									Booking and account activity
								</h1>
								<p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/70 md:text-base">
									See new booking requests plus login, sign-up, and logout activity in real time.
									This page is visible to administrators only.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={loadNotifications}
									className="btn btn-black rounded-full"
								>
									<FiRefreshCw />
									{refreshing ? "Refreshing..." : "Refresh"}
								</button>
								<div className="inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-2 text-sm font-medium text-base-content/70">
									<FiBell />
									<span>{counts.total} notifications</span>
								</div>
								<button
									type="button"
									onClick={clearNotifications}
									disabled={clearing}
									className="btn btn-outline rounded-full"
								>
									<FiTrash2 />
									{clearing ? "Clearing..." : "Clear all"}
								</button>
							</div>
						</div>

						<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Total
								</p>
								<p className="mt-2 text-2xl font-black text-base-content">{counts.total}</p>
							</div>
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Bookings
								</p>
								<p className="mt-2 text-2xl font-black text-blue-600">{counts.bookings}</p>
							</div>
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Logins
								</p>
								<p className="mt-2 text-2xl font-black text-base-content">{counts.logins}</p>
							</div>
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Sign ups
								</p>
								<p className="mt-2 text-2xl font-black text-base-content">{counts.signups}</p>
							</div>
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Logouts
								</p>
								<p className="mt-2 text-2xl font-black text-base-content">{counts.logouts}</p>
							</div>
						</div>
					</div>

					<div className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/80 shadow-2xl backdrop-blur-xl">
						<div className="border-b border-black/5 px-5 py-4 sm:px-6">
							<h2 className="text-xl font-black text-base-content">Activity log</h2>
							<p className="mt-1 text-sm text-base-content/60">
								Sorted from newest to oldest.
							</p>
						</div>

						{loading ? (
							<div className="p-6 text-sm text-base-content/60">Loading notifications...</div>
						) : notifications.length === 0 ? (
							<div className="p-6 text-sm text-base-content/60">
								No booking or account notifications yet.
							</div>
						) : (
							<div className="divide-y divide-black/5">
								{notifications.map((item) => (
									<div
										key={item.id}
										className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
									>
										<div className="flex items-start gap-4">
											<div
												className={[
													"mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold",
													item.event_type === "signup"
														? "bg-emerald-100 text-emerald-700"
														: item.event_type === "logout"
															? "bg-slate-200 text-slate-700"
															: item.event_type === "booking"
																? "bg-blue-100 text-blue-700"
															: "bg-amber-100 text-amber-700",
												].join(" ")}
											>
												{item.event_type === "signup" ? (
													<FiUserPlus />
												) : item.event_type === "logout" ? (
													<FiLogOut />
												) : item.event_type === "booking" ? (
													<FiCalendar />
												) : (
													<FiLogIn />
												)}
											</div>
											<div className="min-w-0">
												<p className="text-sm font-semibold text-base-content">
													<span className="font-black text-slate-900">{item.actor_name || item.actor_email || "Unknown user"}</span>
												</p>
												<p className="mt-1 text-sm text-base-content/65">
													{item.event_type === "signup"
														? "Signed up"
														: item.event_type === "logout"
															? "Logged out"
															: item.event_type === "booking"
																? "New Booking Request"
															: "Logged in"}
													{item.actor_email ? ` - ${item.actor_email}` : ""}
												</p>
												<p className="mt-1 text-xs uppercase tracking-[0.18em] text-base-content/45">
													Profile ID: {item.actor_profile_id}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2 text-sm text-base-content/65">
											<FiClock className="shrink-0" />
											<span>{formatDateTime(item.created_at)}</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default AdminNotifications;
