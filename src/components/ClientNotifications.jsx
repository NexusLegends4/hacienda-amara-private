import React, { useCallback, useContext, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheckCircle, FiRefreshCw, FiTrash2 } from "react-icons/fi";

const ClientNotifications = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [clearing, setClearing] = useState(false);
	const [markingRead, setMarkingRead] = useState(false);

	const formatStatusMessage = (message) => {
		if (!message) return "No message";
		return message.replace(/\s+/g, " ").trim();
	};

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}
		// Only clients should see this page, admins have their own notifications page
		if (profile && profile.role === "admin") {
			navigate("/admin-notifications"); // Redirect admin to their specific notifications
		}
	}, [session, profile, navigate]);

	const fetchNotifications = useCallback(async (showLoading = true) => {
		if (!profile?.id) return;

		if (showLoading) setLoading(true);
		const { data, error } = await supabase
			.from("notifications")
			.select("*")
			.eq("profile_id", profile.id)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error fetching notifications:", error);
			alert(error.message);
		} else {
			setNotifications(data || []);
		}
		setLoading(false);
	}, [profile?.id]);

	useEffect(() => {
		fetchNotifications();

		// Real-time listener for new notifications or updates to existing ones
		const channel = supabase
			.channel(`notifications_for_user_${profile?.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "notifications",
					filter: `profile_id=eq.${profile?.id}`,
				},
				() => {
					fetchNotifications(false);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [profile?.id, fetchNotifications]);

	const markAsRead = async (notificationId) => {
		setMarkingRead(true);
		// Optimistic update: mark as read in UI immediately
		setNotifications((prev) =>
			prev.map((notif) => (notif.id === notificationId ? { ...notif, is_read: true } : notif))
		);

		const { error } = await supabase
			.from("notifications")
			.update({ is_read: true })
			.eq("id", notificationId);

		if (error) {
			console.error("Error marking notification as read:", error);
			alert(error.message);
			// Refresh to true state if DB update failed
			fetchNotifications(false);
		}
		setMarkingRead(false);
	};

	const deleteNotification = async (notificationId) => {
		if (!window.confirm("Are you sure you want to delete this notification?")) return;

		// Optimistic update: remove from UI immediately
		setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));

		const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

		if (error) {
			console.error("Error deleting notification:", error);
			alert("Could not delete notification: " + error.message);
			// Refresh to true state if DB delete failed
			fetchNotifications(false);
		}
	};

	const clearAllNotifications = async () => {
		if (!window.confirm("WARNING: This will permanently delete ALL your notifications. Are you sure?"))
			return;

		setClearing(true);
		const originalNotifs = [...notifications];
		setNotifications([]); // Optimistic clear

		const { error } = await supabase.from("notifications").delete().eq("profile_id", profile.id);

		if (error) {
			alert(error.message);
			setNotifications(originalNotifs); // Rollback on error
		}
		setClearing(false);
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleString("en-PH", {
			dateStyle: "medium",
			timeStyle: "short",
		});
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,_#fffaf0_0%,_#fff4e3_45%,_#f9ead3_100%)] px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-4xl space-y-6">
					<div className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-2xl backdrop-blur md:p-8">
						<h1 className="text-3xl font-black tracking-tight text-base-content md:text-4xl flex items-center gap-3">
							<FiBell className="text-amber-500" /> Your Notifications
						</h1>
						<p className="mt-2 text-sm leading-6 text-base-content/70 md:text-base">
							Stay updated on your booking requests and other important alerts.
						</p>
						<div className="flex flex-wrap gap-3 mt-4">
							<button
								onClick={fetchNotifications}
								className="btn btn-outline btn-sm rounded-full"
								disabled={loading}
							>
								<FiRefreshCw className={loading ? "animate-spin" : ""} />{" "}
								{loading ? "Refreshing..." : "Refresh"}
							</button>
							<button
								onClick={clearAllNotifications}
								className="btn btn-error btn-outline btn-sm rounded-full"
								disabled={loading || clearing || notifications.length === 0}
							>
								<FiTrash2 /> {clearing ? "Clearing..." : "Clear All"}
							</button>
							<button
								onClick={() => navigate(-1)}
								className="btn btn-black btn-sm rounded-full px-6"
							>
								Back
							</button>
						</div>
					</div>

					<div className="space-y-4">
						{loading && <p className="text-center text-gray-500">Loading notifications...</p>}
						{!loading && notifications.length === 0 && (
							<p className="text-center text-gray-500">No notifications yet.</p>
						)}
						{notifications.map((notif) => (
							<div
								key={notif.id}
								className={`flex items-center justify-between rounded-xl p-4 shadow-sm ${
									notif.is_read ? "bg-gray-100 text-gray-500" : "bg-white text-gray-800"
								}`}
							>
								<div className="flex-1">
									<p className={`font-medium ${notif.is_read ? "text-gray-500" : "text-gray-900"}`}>
										{formatStatusMessage(notif.message)}
									</p>
									<p className="text-xs text-gray-400 mt-1">
										{formatDate(notif.created_at)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									{!notif.is_read && (
										<button
											onClick={() => markAsRead(notif.id)}
											className="btn btn-ghost btn-sm text-primary hover:bg-primary/10"
											disabled={markingRead}
										>
											<FiCheckCircle /> Mark as Read
										</button>
									)}
									<button
										onClick={() => deleteNotification(notif.id)}
										className="btn btn-ghost btn-sm text-error hover:bg-error/10"
										title="Delete notification"
									>
										<FiTrash2 />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ClientNotifications;
