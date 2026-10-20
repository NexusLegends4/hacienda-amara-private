import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
	const profileId = profile?.id;
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [clearing, setClearing] = useState(false);
	const [activityWarning, setActivityWarning] = useState("");

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}

		if (profile && !["admin", "staff"].includes(profile.role)) {
			navigate("/");
		}
	}, [session, profile, navigate]);

	const fetchNotifications = useCallback(async () => {
		if (!profileId) return { data: [], error: null };
		const [
			{ data, error },
			{ data: payments, error: paymentError },
		] = await Promise.all([
			supabase
				.from("auth_notifications")
				.select("id, event_type, actor_profile_id, actor_name, actor_email, created_at")
				.order("created_at", { ascending: false }),
			supabase
				.from("notifications")
				.select("id, message, is_read, created_at")
				.eq("profile_id", profileId)
				.eq("type", "payment")
				.order("created_at", { ascending: false }),
		]);

		if (paymentError) {
			return { data: null, error: paymentError };
		}
		if (error) console.error("Unable to load account activity notifications:", error);

		const paymentEntries = (payments || []).map((payment) => ({
			id: `payment-${payment.id}`,
			event_type: "payment",
			actor_profile_id: profileId,
			actor_name: payment.message,
			actor_email: "",
			created_at: payment.created_at,
			is_read: payment.is_read,
		}));
		return {
			data: [...(data || []), ...paymentEntries].sort(
				(left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
			),
			warning: error ? "Account activity could not be loaded, but payment alerts are available." : "",
			error: null,
		};
	}, [profileId]);

	const loadNotifications = useCallback(async () => {
		if (!profileId) return;
		setRefreshing(true);
		const result = await fetchNotifications();
		if (result.error) {
			alert(result.error.message || result.error);
			setRefreshing(false);
			setLoading(false);
			return;
		}
		setNotifications(result.data || []);
		setActivityWarning(result.warning || "");
		setRefreshing(false);
		setLoading(false);
	}, [fetchNotifications, profileId]);

	const clearNotifications = async () => {
		const confirmed = window.confirm("Clear all auth notifications?");
		if (!confirmed) return;

		setClearing(true);
		const [
			{ error },
			{ error: paymentError },
		] = await Promise.all([
			supabase
				.from("auth_notifications")
				.delete()
				.gte("created_at", "1970-01-01T00:00:00Z"),
			supabase
				.from("notifications")
				.delete()
				.eq("profile_id", profileId)
				.eq("type", "payment"),
		]);

		if (error || paymentError) {
			alert(error?.message || paymentError?.message || "Notifications could not be cleared.");
			await loadNotifications();
			setClearing(false);
			return;
		}

		setNotifications([]);
		setClearing(false);
	};

	useEffect(() => {
		if (!["admin", "staff"].includes(profile?.role)) return undefined;

		let cancelled = false;
		void fetchNotifications().then((result) => {
			if (cancelled) return;
			if (result.error) {
				alert(result.error.message || result.error);
			} else {
				setNotifications(result.data || []);
				setActivityWarning(result.warning || "");
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [fetchNotifications, profile?.role]);

	useEffect(() => {
		if (!["admin", "staff"].includes(profile?.role)) return undefined;

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
				event: "*",
				schema: "public",
				table: "notifications",
				filter: `profile_id=eq.${profileId}`,
			},
			() => void loadNotifications(),
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
	}, [loadNotifications, profileId, profile?.role]);

	const counts = useMemo(
		() => ({
			total: notifications.length,
			logins: notifications.filter((item) => item.event_type === "login").length,
			signups: notifications.filter((item) => item.event_type === "signup").length,
			logouts: notifications.filter((item) => item.event_type === "logout").length,
			bookings: notifications.filter((item) => item.event_type === "booking").length,
			payments: notifications.filter((item) => item.event_type === "payment").length,
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
									{profile?.role === "admin" ? "Admin Notifications" : "Staff Notifications"}
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-5xl">
									Booking and account activity
								</h1>
								<p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/70 md:text-base">
									See payment alerts, new booking requests, and account activity in real time.
									This page is available to authorized staff and administrators.
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

						<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Total
								</p>
								<p className="mt-2 text-2xl font-black text-base-content">{counts.total}</p>
							</div>
							{activityWarning && (
								<p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
									{activityWarning}
								</p>
							)}
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Bookings
								</p>
								<p className="mt-2 text-2xl font-black text-blue-600">{counts.bookings}</p>
							</div>
							<div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-4">
								<p className="text-xs uppercase tracking-[0.2em] text-base-content/45">
									Payments
								</p>
								<p className="mt-2 text-2xl font-black text-emerald-600">{counts.payments}</p>
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
																		: item.event_type === "payment"
																			? "bg-emerald-100 text-emerald-700"
																	: "bg-amber-100 text-amber-700",
												].join(" ")}
											>
												{item.event_type === "signup" ? (
													<FiUserPlus />
												) : item.event_type === "logout" ? (
													<FiLogOut />
												) : item.event_type === "booking" ? (
													<FiCalendar />
												) : item.event_type === "payment" ? (
													<FiBell />
												) : (
													<FiLogIn />
												)}
											</div>
											<div className="min-w-0">
												<p className="text-sm font-semibold text-base-content">
													<span className="font-black text-slate-900">
														{item.event_type === "payment" ? "PayMongo payment received" : item.actor_name || item.actor_email || "Unknown user"}
													</span>
												</p>
												<p className="mt-1 text-sm text-base-content/65">
													{item.event_type === "payment"
														? item.actor_name
														: item.event_type === "signup"
														? "Signed up"
														: item.event_type === "logout"
															? "Logged out"
															: item.event_type === "booking"
																? "New Booking Request"
															: "Logged in"}
													{item.event_type !== "payment" && item.actor_email ? ` - ${item.actor_email}` : ""}
												</p>
												<p className="mt-1 text-xs uppercase tracking-[0.18em] text-base-content/45">
													{item.event_type === "payment" ? (item.is_read ? "Read" : "Unread") : `Profile ID: ${item.actor_profile_id}`}
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
