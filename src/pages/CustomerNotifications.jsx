import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiBell, FiCalendar, FiCopy, FiRefreshCw, FiUser } from "react-icons/fi";

const CustomerNotifications = () => {
	const { reservationToken } = useParams();
	const navigate = useNavigate();
	const [reservation, setReservation] = useState(null);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);

	const loadNotification = useCallback(async (showLoading = true) => {
		if (!reservationToken) {
			navigate("/", { replace: true });
			return;
		}

		if (showLoading) setLoading(true);
		const { data, error } = await supabase.rpc("get_guest_reservation_notification", {
			reservation_token: reservationToken,
		});

		if (error || !data?.length) {
			setReservation(null);
		} else {
			setReservation(data[0]);
		}
		if (showLoading) setLoading(false);
	}, [reservationToken, navigate]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void loadNotification();

		const channel = supabase
			.channel(`reservation-notification-${reservationToken}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "guest_reservation_notifications",
					filter: `reservation_id=eq.${reservationToken}`,
				},
				() => void loadNotification(false),
			)
			.subscribe();

		const refreshTimer = window.setInterval(() => {
			void loadNotification(false);
		}, 5000);

		return () => {
			window.clearInterval(refreshTimer);
			void supabase.removeChannel(channel);
		};
	}, [loadNotification, reservationToken]);

	const copyNotificationLink = async () => {
		const notificationUrl = `${window.location.origin}/customer-notifications/${reservationToken}`;

		try {
			await navigator.clipboard.writeText(notificationUrl);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			alert("Unable to copy the notification link.");
		}
	};

	const statusLabel = reservation?.status === "confirmed"
		? "Accepted"
		: reservation?.status === "cancelled"
			? "Declined"
			: "Pending";

	const statusClasses = reservation?.status === "confirmed"
		? "bg-emerald-50 text-emerald-800 border-emerald-200"
		: reservation?.status === "cancelled"
			? "bg-rose-50 text-rose-800 border-rose-200"
			: "bg-amber-50 text-amber-800 border-amber-200";

	return (
		<MainLayout noScroll>
			<div className="flex-1 bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 sm:px-4 md:px-6 py-6 sm:py-8 lg:py-12 min-h-0">
				<div className="mx-auto max-w-xl sm:max-w-2xl h-full flex flex-col min-h-0">
					<div className="rounded-2xl sm:rounded-[2rem] border border-black/5 bg-white/80 p-4 sm:p-6 md:p-8 lg:p-9 shadow-2xl backdrop-blur-xl flex-1 flex flex-col min-h-0">
						<div className="flex items-start justify-between gap-3 sm:gap-4 flex-shrink-0 flex-wrap">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
									Private Reservation Update
								</p>
								<h1 className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-base-content">
									<FiBell className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6" />
									Reservation Notification
								</h1>
							</div>
							<button
								type="button"
								onClick={loadNotification}
								className="btn btn-outline btn-sm rounded-full shrink-0"
								disabled={loading}
							>
								<FiRefreshCw className={loading ? "animate-spin" : ""} />
								<span className="hidden sm:inline">Refresh</span>
							</button>
						</div>

						{loading ? (
							<div className="mt-6 sm:mt-10 flex-1 flex items-center justify-center min-h-0">
								<span className="loading loading-spinner loading-lg"></span>
							</div>
						) : !reservation ? (
							<div className="mt-6 sm:mt-10 flex-1 rounded-2xl sm:rounded-3xl border-2 border-dashed border-black/10 bg-base-100/40 p-6 sm:p-8 text-center flex flex-col items-center justify-center min-h-0">
								<FiBell className="mx-auto text-3xl sm:text-4xl text-base-content/35" />
								<h2 className="mt-3 sm:mt-4 text-lg sm:text-xl font-bold">Notification not found</h2>
								<p className="mt-2 text-sm text-base-content/65">
									This link is invalid, or no reservation matches it.
								</p>
								<button onClick={() => navigate("/")} className="btn btn-black mt-4 sm:mt-6 rounded-full">
									Go to Home
								</button>
							</div>
						) : (
							<div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
								<div className={`mt-5 sm:mt-8 flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border p-4 sm:p-5 ${statusClasses} flex-shrink-0`}>
									<FiBell className="text-xl sm:text-2xl" />
									<div>
										<p className="text-xs font-bold uppercase tracking-wider">
											{statusLabel}
										</p>
										<p className="mt-1 font-semibold text-sm sm:text-base">{reservation.message}</p>
									</div>
								</div>

								<div className="mt-4 sm:mt-5 grid gap-3 sm:grid-cols-2 flex-shrink-0">
									<div className="rounded-xl sm:rounded-2xl bg-base-100/60 p-3 sm:p-4">
										<p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-base-content/50">
											<FiUser /> Customer
										</p>
										<p className="mt-1 sm:mt-2 font-semibold text-sm sm:text-base">{reservation.guest_name}</p>
									</div>
									<div className="rounded-xl sm:rounded-2xl bg-base-100/60 p-3 sm:p-4">
										<p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-base-content/50">
											<FiCalendar /> Schedule
										</p>
										<p className="mt-1 sm:mt-2 font-semibold text-sm sm:text-base">{reservation.room_type}</p>
										<p className="text-xs sm:text-sm text-base-content/65">{reservation.check_in}</p>
									</div>
								</div>

								<div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl bg-black/5 p-3 sm:p-4 flex-shrink-0">
									<p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
										Private access link
									</p>
									<div className="mt-2 sm:mt-3 flex flex-col gap-2">
										<code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 text-xs text-base-content/70 break-all">
											{window.location.href}
										</code>
										<button
											type="button"
											onClick={copyNotificationLink}
											className="btn btn-black btn-sm rounded-xl whitespace-nowrap w-full sm:w-auto"
										>
											<FiCopy className="w-4 h-4" /> {copied ? "Copied" : "Copy Link"}
										</button>
									</div>
									<p className="mt-2 text-xs text-base-content/55">
										Keep this private link secure. Anyone who has it can view this reservation update.
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default CustomerNotifications;