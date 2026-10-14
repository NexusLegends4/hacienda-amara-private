import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiBell, FiCalendar, FiCopy, FiRefreshCw, FiUser } from "react-icons/fi";
import { QRCodeSVG } from "qrcode.react";

const CustomerNotifications = () => {
	const { reservationToken } = useParams();
	const navigate = useNavigate();
	const [reservation, setReservation] = useState(null);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState("");
	const notificationUrl = `${window.location.origin}/customer-notifications/${reservationToken}`;

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
		setCopyError("");
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(notificationUrl);
			} else {
				throw new Error("Clipboard access is unavailable.");
			}
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			const input = document.getElementById("reservation-notification-link");
			if (input instanceof HTMLInputElement) {
				input.focus();
				input.select();
				input.setSelectionRange(0, input.value.length);
				if (document.execCommand("copy")) {
					setCopied(true);
					window.setTimeout(() => setCopied(false), 2000);
					return;
				}
			}
			setCopyError("Copy was blocked. The link is selected so you can copy it manually.");
		}
	};

	const statusLabel = reservation?.status === "confirmed"
		? "Accepted"
		: reservation?.status === "denied"
			? "Denied"
			: reservation?.status === "cancelled"
				? "Cancelled"
				: "Pending";

	const statusClasses = reservation?.status === "confirmed"
		? "bg-emerald-50 text-emerald-800 border-emerald-200"
		: ["denied", "cancelled"].includes(reservation?.status)
			? "bg-rose-50 text-rose-800 border-rose-200"
			: "bg-amber-50 text-amber-800 border-amber-200";

	return (
		<MainLayout>
			<div className="min-h-[calc(100dvh-5rem)] bg-[#f0ede7] px-3 py-4 sm:px-4 md:px-6 lg:px-8">
				<div className="mx-auto max-w-[460px]">
					<div className="rounded-[28px] border border-black/5 bg-[#f5f3f0] shadow-[0_22px_40px_rgba(31,24,18,0.12)]">
						<div className="flex items-center justify-between px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
									Hacienda Amara
								</p>
								<p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
									Private Resort and Events Place
								</p>
							</div>
							<button
								type="button"
								onClick={loadNotification}
								className="btn btn-ghost btn-square btn-sm rounded-xl border border-slate-300/80 bg-white/60"
								disabled={loading}
								aria-label="Refresh reservation notification"
							>
								<FiRefreshCw className={loading ? "animate-spin" : ""} />
							</button>
						</div>

						<div className="border-t border-slate-200/80 bg-[#f7f6f5] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
							<div className="flex items-center justify-between gap-3">
								<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
									Private Reservation Update
								</p>
							</div>
							<h1 className="mt-3 flex items-center gap-3 text-[2rem] font-black tracking-[-0.06em] text-slate-900 leading-[1.05]">
								<FiBell className="text-amber-500 w-6 h-6" />
								<span>Reservation Notification</span>
							</h1>

							{loading ? (
								<div className="mt-6 flex items-center justify-center py-10">
									<span className="loading loading-spinner loading-lg"></span>
								</div>
							) : !reservation ? (
								<div className="mt-6 rounded-[22px] border-2 border-dashed border-black/10 bg-base-100/40 p-6 text-center flex flex-col items-center justify-center">
									<FiBell className="mx-auto text-3xl text-base-content/35" />
									<h2 className="mt-3 text-xl font-bold">Notification not found</h2>
									<p className="mt-2 text-sm text-base-content/65">
										This link is invalid, or no reservation matches it.
									</p>
									<button onClick={() => navigate("/")} className="btn btn-black mt-4 rounded-full">
										Go to Home
									</button>
								</div>
							) : (
								<div className="mt-5 flex flex-col gap-4 pb-2">
									<div className={`flex items-center gap-3 rounded-[18px] border p-4 ${statusClasses}`}>
										<FiBell className="text-xl" />
										<div>
											<p className="text-[11px] font-black uppercase tracking-[0.2em]">
												{statusLabel}
											</p>
											<p className="mt-1 text-sm sm:text-base font-semibold leading-snug">
												{reservation.message}
											</p>
										</div>
									</div>

									<div className="grid gap-3">
										<div className="rounded-[18px] bg-[#f1f1ef] p-4">
											<p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
												<FiUser className="h-4 w-4" /> Customer
											</p>
											<p className="mt-2 text-2xl font-bold leading-tight text-slate-900">{reservation.guest_name}</p>
										</div>
										<div className="rounded-[18px] bg-[#f1f1ef] p-4">
											<p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
												<FiCalendar className="h-4 w-4" /> Schedule
											</p>
											<p className="mt-2 text-lg font-bold text-slate-900">{reservation.room_type}</p>
											<p className="mt-1 text-sm text-slate-600">{reservation.check_in}</p>
										</div>
									</div>

									{reservation.status === "confirmed" && (
										<div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-center">
											<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">Check-in QR code</p>
											<div className="mt-3 inline-block rounded-2xl bg-white p-3 shadow-sm">
												<QRCodeSVG
													value={`${window.location.origin}/customer-notifications/${reservationToken}`}
													size={200}
													level="M"
													includeMargin
													title="Hacienda Amara check-in QR code"
												/>
											</div>
											<p className="mt-3 text-xs text-emerald-900/80">Show this QR code to the resort staff when you arrive so they can verify your booking.</p>
										</div>
									)}

									<div className="rounded-[18px] bg-[#efefee] p-3">
										<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
											Private access link
										</p>
										<div className="mt-3 space-y-3">
											<input
												id="reservation-notification-link"
												type="text"
												readOnly
												aria-label="Private reservation notification link"
												value={notificationUrl}
												onFocus={(event) => event.currentTarget.select()}
												className="block w-full select-text rounded-[12px] border-0 bg-white px-3 py-3 text-xs leading-5 text-slate-700 focus:outline-2 focus:outline-offset-2 focus:outline-amber-500"
											/>
											<button
												type="button"
												onClick={copyNotificationLink}
												aria-live="polite"
												className="btn btn-black h-11 min-h-11 w-full rounded-full text-sm font-semibold"
											>
												<FiCopy className="w-4 h-4" /> {copied ? "Copied" : "Copy Link"}
											</button>
											{copyError && <p role="status" className="text-xs leading-5 text-rose-700">{copyError}</p>}
										</div>
										<p className="mt-3 text-xs text-slate-600 leading-5">
											Keep this private link secure. Anyone who has it can view this reservation update.
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default CustomerNotifications;