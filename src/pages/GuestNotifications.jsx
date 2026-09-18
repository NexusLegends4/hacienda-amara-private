import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiBell, FiCalendar, FiCopy, FiRefreshCw, FiUser } from "react-icons/fi";

const GuestNotifications = () => {
	const { reservationToken } = useParams();
	const navigate = useNavigate();
	const [reservation, setReservation] = useState(null);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);

	const loadNotification = useCallback(async () => {
		if (!reservationToken) {
			navigate("/", { replace: true });
			return;
		}

		setLoading(true);
		const { data, error } = await supabase.rpc("get_guest_reservation_notification", {
			reservation_token: reservationToken,
		});

		if (error || !data?.length) {
			setReservation(null);
		} else {
			setReservation(data[0]);
		}
		setLoading(false);
	}, [reservationToken, navigate]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void loadNotification();
	}, [loadNotification]);

	const copyNotificationLink = async () => {
		const notificationUrl = `${window.location.origin}/guest-notifications/${reservationToken}`;

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
		: "Pending";

	const statusClasses = reservation?.status === "confirmed"
		? "bg-emerald-50 text-emerald-800 border-emerald-200"
		: "bg-amber-50 text-amber-800 border-amber-200";

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-8 sm:px-4 sm:py-12">
				<div className="mx-auto max-w-2xl">
					<div className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/50">
									Private Reservation Update
								</p>
								<h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									<FiBell className="text-amber-500" />
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
								Refresh
							</button>
						</div>

						{loading ? (
							<div className="mt-10 flex min-h-[240px] items-center justify-center">
								<span className="loading loading-spinner loading-lg"></span>
							</div>
						) : !reservation ? (
							<div className="mt-10 rounded-3xl border-2 border-dashed border-black/10 bg-base-100/40 p-8 text-center">
								<FiBell className="mx-auto text-4xl text-base-content/35" />
								<h2 className="mt-4 text-xl font-bold">Notification not found</h2>
								<p className="mt-2 text-sm text-base-content/65">
									This link is invalid, or no reservation matches it.
								</p>
								<button onClick={() => navigate("/")} className="btn btn-black mt-6 rounded-full">
									Go to Home
								</button>
							</div>
						) : (
							<>
								<div className={`mt-8 flex items-center gap-3 rounded-2xl border p-5 ${statusClasses}`}>
									<FiBell className="text-2xl" />
									<div>
										<p className="text-xs font-bold uppercase tracking-wider">
											{statusLabel}
										</p>
										<p className="mt-1 font-semibold">{reservation.message}</p>
									</div>
								</div>

								<div className="mt-5 grid gap-3 sm:grid-cols-2">
									<div className="rounded-2xl bg-base-100/60 p-4">
										<p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-base-content/50">
											<FiUser /> Guest
										</p>
										<p className="mt-2 font-semibold">{reservation.guest_name}</p>
									</div>
									<div className="rounded-2xl bg-base-100/60 p-4">
										<p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-base-content/50">
											<FiCalendar /> Schedule
										</p>
										<p className="mt-2 font-semibold">{reservation.room_type}</p>
										<p className="text-sm text-base-content/65">{reservation.check_in}</p>
									</div>
								</div>

								<div className="mt-6 rounded-2xl bg-black/5 p-4">
									<p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
										Private access link
									</p>
									<div className="mt-3 flex flex-col gap-2 sm:flex-row">
										<code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 text-xs text-base-content/70">
											{window.location.href}
										</code>
										<button
											type="button"
											onClick={copyNotificationLink}
											className="btn btn-black btn-sm rounded-xl whitespace-nowrap"
										>
											<FiCopy /> {copied ? "Copied" : "Copy Link"}
										</button>
									</div>
									<p className="mt-2 text-xs text-base-content/55">
										Keep this private link secure. Anyone who has it can view this reservation update.
									</p>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default GuestNotifications;
