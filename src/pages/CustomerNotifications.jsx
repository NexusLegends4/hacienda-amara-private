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
	const [paymentEmail, setPaymentEmail] = useState(() => {
		try {
			return localStorage.getItem("hacienda-reviewer-email") || "";
		} catch {
			return "";
		}
	});
	const [checkoutLoading, setCheckoutLoading] = useState(false);
	const [checkoutError, setCheckoutError] = useState("");
	const notificationUrl = `${window.location.origin}/customer-notifications/${reservationToken}`;
	const paymentReturn = new URLSearchParams(window.location.search).get("payment");

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

	const continueToCheckout = async (event) => {
		event.preventDefault();
		setCheckoutError("");
		setCheckoutLoading(true);
		try {
			const response = await fetch("/api/paymongo-checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					reservationId: reservationToken,
					email: paymentEmail.trim().toLowerCase(),
					paymentType: reservation?.payment_status === "down_payment_paid" ? "balance" : "deposit",
				}),
			});
			let result;
			try {
				result = await response.json();
			} catch {
				throw new Error("Checkout service returned an invalid response. Please retry.");
			}
			if (!response.ok || !result.checkoutUrl) {
				throw new Error(result.error || "PayMongo checkout could not be started. Please retry.");
			}
			window.location.assign(result.checkoutUrl);
		} catch (error) {
			setCheckoutError(error instanceof Error ? error.message : "PayMongo checkout could not be started. Please retry.");
			setCheckoutLoading(false);
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
	const depositRefundMessage = reservation?.security_deposit_refund_status === "pending"
		? "The ₱2,000 security-deposit refund has been submitted to PayMongo. The time it takes to appear depends on your payment provider."
		: reservation?.security_deposit_refund_status === "succeeded"
			? "PayMongo has completed the ₱2,000 security-deposit refund. Your bank or wallet may take additional time to show it."
			: reservation?.security_deposit_refund_status === "manual_review" ||
				reservation?.security_deposit_refund_status === "processing"
				? "The security-deposit refund needs staff review. Please contact Hacienda Amara; do not assume the refund has been completed."
				: null;
	const latePaymentMessage = reservation?.late_payment_received_at
		? "PayMongo received payment after this booking had been automatically denied. The reservation remains denied while resort staff reviews the payment; please contact Hacienda Amara."
		: null;

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
												{reservation.status === "pending"
													? "Complete the initial PayMongo payment within one hour of starting checkout. Successful payment automatically accepts the booking; if payment is not received in time, it is automatically denied."
													: reservation.message}
											</p>
										</div>
									</div>
									{latePaymentMessage && (
										<p role="alert" className="rounded-[18px] border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
											{latePaymentMessage}
										</p>
									)}

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

									<div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4">
										<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-900">Payment summary</p>
										<div className="mt-3 space-y-1 text-sm text-amber-950">
											<p className="flex justify-between gap-3"><span>Booking total</span><span>₱{Number(reservation.total_price || 0).toLocaleString()}</span></p>
											<p className="flex justify-between gap-3"><span>Down payment (50%, non-refundable)</span><span>₱{Number(reservation.down_payment_amount || Math.round(Number(reservation.total_price || 0) * 50) / 100).toLocaleString()}</span></p>
											<p className="flex justify-between gap-3"><span>Refundable security deposit</span><span>₱{Number(reservation.security_deposit_amount || 2_000).toLocaleString()}</span></p>
											<p className="flex justify-between gap-3 font-bold">
												<span>{reservation.payment_status === "down_payment_paid" ? "Remaining balance" : "Due now"}</span>
												<span>₱{(reservation.payment_status === "fully_paid"
													? 0
													: reservation.payment_status === "down_payment_paid"
														? Number(reservation.balance_due || 0)
														: Number(reservation.down_payment_amount || Math.round(Number(reservation.total_price || 0) * 50) / 100) + Number(reservation.security_deposit_amount || 2_000)
												).toLocaleString()}</span>
											</p>
											{reservation.payment_status !== "fully_paid" && reservation.payment_status !== "down_payment_paid" && (
												<p className="flex justify-between gap-3"><span>Balance due at least one day before stay</span><span>₱{Number(reservation.balance_due ?? (Number(reservation.total_price || 0) - Math.round(Number(reservation.total_price || 0) * 50) / 100)).toLocaleString()}</span></p>
											)}
										</div>
										{reservation.payment_status === "fully_paid" ? (
											<p role="status" className="mt-3 rounded-xl bg-emerald-100 p-3 text-sm font-semibold text-emerald-900">
												PayMongo has confirmed the down payment, security deposit, and remaining balance. Your reservation was automatically accepted after the initial payment. The ₱2,000 security deposit remains refundable upon check-out.
											</p>
										) : reservation.payment_status === "down_payment_paid" ? (
											<p role="status" className="mt-3 rounded-xl bg-emerald-100 p-3 text-sm font-semibold text-emerald-900">
												{latePaymentMessage
													? "This payment arrived after the one-hour deadline. Your reservation remains denied and the payment is flagged for staff review."
													: "PayMongo has confirmed the down payment and refundable security deposit, and your reservation was automatically accepted. Settle the remaining balance at least one day before your stay."}
											</p>
										) : reservation.payment_status !== "down_payment_paid" && !["cancelled", "denied", "rejected"].includes(String(reservation.status).toLowerCase()) ? (
											<>
											<p role="status" className="mt-3 rounded-xl border border-amber-300 bg-white/80 p-3 text-sm font-semibold text-amber-950">
												Complete the initial PayMongo payment within one hour of starting checkout. Payment automatically accepts your reservation; if payment is not received in time, the request is automatically denied.
											</p>
											<form onSubmit={continueToCheckout} className="mt-4 space-y-3">
												<label className="block text-sm font-semibold text-amber-950" htmlFor="booking-payment-email">Booking email</label>
												<input
													id="booking-payment-email"
													type="email"
													autoComplete="email"
													required
													value={paymentEmail}
													onChange={(event) => setPaymentEmail(event.target.value)}
													className="input input-bordered w-full rounded-xl bg-white"
													placeholder="you@gmail.com"
												/>
												{["success", "balance_success"].includes(paymentReturn) && (
													<p role="status" className="text-sm text-amber-900">PayMongo returned you to this page. We are waiting for its secure payment confirmation; this page will update automatically.</p>
												)}
												{["cancelled", "balance_cancelled"].includes(paymentReturn) && (
													<p role="status" className="text-sm text-amber-900">Checkout was not completed. You can retry securely below.</p>
												)}
												{checkoutError && <p role="alert" className="text-sm font-medium text-rose-700">{checkoutError}</p>}
												<button type="submit" disabled={checkoutLoading} className="btn btn-black h-11 w-full rounded-full">
													{checkoutLoading ? <span className="loading loading-spinner" /> : "Pay down payment and deposit securely"}
												</button>
											</form>
											</>
										) : reservation.payment_status === "down_payment_paid" && !["cancelled", "denied", "rejected"].includes(String(reservation.status).toLowerCase()) ? (
											<form onSubmit={continueToCheckout} className="mt-4 space-y-3">
												<label className="block text-sm font-semibold text-amber-950" htmlFor="booking-payment-email">Booking email</label>
												<input
													id="booking-payment-email"
													type="email"
													autoComplete="email"
													required
													value={paymentEmail}
													onChange={(event) => setPaymentEmail(event.target.value)}
													className="input input-bordered w-full rounded-xl bg-white"
													placeholder="you@gmail.com"
												/>
												{paymentReturn === "balance_success" && (
													<p role="status" className="text-sm text-amber-900">PayMongo returned you to this page. We are waiting for its secure balance-payment confirmation.</p>
												)}
												{paymentReturn === "balance_cancelled" && (
													<p role="status" className="text-sm text-amber-900">Balance checkout was not completed. You can retry securely below.</p>
												)}
												{checkoutError && <p role="alert" className="text-sm font-medium text-rose-700">{checkoutError}</p>}
												<button type="submit" disabled={checkoutLoading} className="btn btn-black h-11 w-full rounded-full">
													{checkoutLoading ? <span className="loading loading-spinner" /> : "Pay remaining balance with PayMongo"}
												</button>
											</form>
										) : null}
										{depositRefundMessage && (
											<p role="status" className="mt-3 rounded-xl border border-amber-300 bg-white/80 p-3 text-sm font-semibold text-amber-950">
												{depositRefundMessage}
											</p>
										)}
										<p className="mt-3 text-xs leading-5 text-amber-900">The balance is due at least one day before your stay. The ₱2,000 security deposit is refundable upon check-out. The down payment is non-refundable.</p>
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