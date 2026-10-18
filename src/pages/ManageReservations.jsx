import React, { useState, useEffect, useContext, useCallback } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiCheckCircle, FiRefreshCw, FiXCircle } from "react-icons/fi";

const getInitials = (name) => {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const reservationGuestName = (reservation) =>
	`${reservation.profiles?.firstname || ""} ${reservation.profiles?.lastname || ""}`.trim() ||
	reservation.guest_name ||
	"Guest";

const ManageReservations = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [reservations, setReservations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [updatingReservationId, setUpdatingReservationId] = useState(null);
	const [denyingReservationId, setDenyingReservationId] = useState(null);
	const [rejectionReason, setRejectionReason] = useState("");
	const [maintenancePeriods, setMaintenancePeriods] = useState([]);
	const [maintenanceStart, setMaintenanceStart] = useState("");
	const [maintenanceEnd, setMaintenanceEnd] = useState("");
	const [maintenanceReason, setMaintenanceReason] = useState("");
	const [maintenanceLoading, setMaintenanceLoading] = useState(false);
	const [maintenanceError, setMaintenanceError] = useState("");
	const canManageReservations = ["admin", "staff"].includes(profile?.role);
	const isAdmin = profile?.role === "admin";

	const fetchReservations = useCallback(async (showLoading = true) => {
		if (showLoading) setLoading(true);

		const { data, error } = await supabase
			.from("reservations")
			.select("*, profiles(firstname, lastname, avatar_url, email)")
			.order("created_at", { ascending: false });

		if (error) {
			alert(error.message);
		} else if (data) {
			setReservations(data);
		}

		setLoading(false);
	}, []);

	const fetchMaintenance = useCallback(async () => {
		const { data, error } = await supabase.rpc("get_reservation_maintenance");
		if (error) {
			console.error("Unable to load maintenance periods:", error);
			setMaintenanceError("Maintenance schedules could not be loaded.");
			return;
		}
		setMaintenanceError("");
		setMaintenancePeriods(data || []);
	}, []);

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}
		if (profile && !["admin", "staff"].includes(profile.role)) {
			navigate("/");
		}
	}, [session, profile, navigate]);

	useEffect(() => {
		if (canManageReservations) {
			fetchReservations();

			const channel = supabase
				.channel("manage-reservations-live")
				.on(
					"postgres_changes",
					{ event: "*", schema: "public", table: "reservations" },
					() => fetchReservations(false)
				)
				.on(
					"postgres_changes",
					{ event: "UPDATE", schema: "public", table: "profiles" },
					() => fetchReservations(false)
				)
				.on(
					"postgres_changes",
					{ event: "*", schema: "public", table: "reservation_maintenance" },
					() => fetchMaintenance()
				)
				.subscribe();

			fetchMaintenance();
			const refreshTimer = window.setInterval(() => {
				fetchReservations(false);
				fetchMaintenance();
			}, 60_000);
			return () => {
				window.clearInterval(refreshTimer);
				supabase.removeChannel(channel);
			};
		}
	}, [canManageReservations, fetchMaintenance, fetchReservations]);

	const updateStatus = async (id, newStatus, reason = "") => {
		const resToUpdate = reservations.find((reservation) => reservation.id === id);
		if (!resToUpdate || !["confirmed", "denied", "cancelled"].includes(newStatus)) return;
		const currentStatus = resToUpdate.status || "pending";
		if (
			(newStatus === "confirmed" || newStatus === "denied") &&
			currentStatus !== "pending"
		) return;
		if (newStatus === "cancelled" && currentStatus !== "confirmed") return;

		setUpdatingReservationId(id);
		try {
			const { data: updatedReservation, error } = await supabase
				.from("reservations")
				.update({
					status: newStatus,
					rejection_reason: newStatus === "denied" ? reason.trim() || null : null,
				})
				.eq("id", id)
				.select("id, status")
				.maybeSingle();

			if (error) throw error;
			if (!updatedReservation) {
				throw new Error("No reservation was updated. Check that the latest reservation permission migration is applied and try again.");
			}

			const clientName = reservationGuestName(resToUpdate);
			const clientEmail = resToUpdate.guest_email || resToUpdate.profiles?.email;
			let emailError = clientEmail ? "" : "No email address is available for this reservation.";
			if (clientEmail) {
				try {
					const response = await fetch("/api/reservation-status-notification", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${session?.access_token || ""}`,
						},
						body: JSON.stringify({
							name: clientName,
							email: clientEmail,
							status: newStatus,
							roomType: resToUpdate.room_type,
							checkIn: resToUpdate.check_in,
							rejectionReason: newStatus === "denied" ? reason.trim() : "",
						}),
					});
					const result = await response.json();
					if (!response.ok) throw new Error(result.error || "Email could not be sent.");
				} catch (error) {
					console.error("Failed to send reservation status email:", error);
					emailError = error.message || "Email could not be sent.";
				}
			}

			const actionLabels = {
				confirmed: "accepted",
				denied: "denied",
				cancelled: "cancelled",
			};
			alert(
				`Reservation for ${clientName} was ${actionLabels[newStatus]}.` +
				(emailError ? ` However, the email notification failed: ${emailError}` : ""),
			);
			await fetchReservations(false);
		} catch (error) {
			alert(`Could not update reservation: ${error.message}`);
		} finally {
			setUpdatingReservationId(null);
		}
	};

	const submitRejection = async (event) => {
		event.preventDefault();
		const id = denyingReservationId;
		if (!id || rejectionReason.length > 300) return;
		setDenyingReservationId(null);
		await updateStatus(id, "denied", rejectionReason);
		setRejectionReason("");
	};

	const addMaintenance = async (event) => {
		event.preventDefault();
		if (!maintenanceStart || !maintenanceEnd || maintenanceEnd < maintenanceStart) {
			setMaintenanceError("Choose a valid maintenance date range.");
			return;
		}
		if (maintenanceReason.length > 300) {
			setMaintenanceError("Maintenance notes must be 300 characters or fewer.");
			return;
		}
		setMaintenanceLoading(true);
		setMaintenanceError("");
		const { error } = await supabase.from("reservation_maintenance").insert({
			start_date: maintenanceStart,
			end_date: maintenanceEnd,
			reason: maintenanceReason.trim(),
			created_by: session.user.id,
		});
		if (error) {
			setMaintenanceError(error.message);
		} else {
			setMaintenanceStart("");
			setMaintenanceEnd("");
			setMaintenanceReason("");
			await fetchMaintenance();
		}
		setMaintenanceLoading(false);
	};

	const deleteMaintenance = async (period) => {
		if (!window.confirm(`Remove maintenance block from ${period.start_date} to ${period.end_date}?`)) return;
		const { error } = await supabase
			.from("reservation_maintenance")
			.delete()
			.eq("id", period.id);
		if (error) {
			setMaintenanceError(`Could not remove maintenance schedule: ${error.message}`);
			return;
		}
		setMaintenancePeriods((current) => current.filter((item) => item.id !== period.id));
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-5 shadow-2xl backdrop-blur sm:rounded-[2rem] sm:p-6 md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									{isAdmin ? "Admin Dashboard" : "Staff Dashboard"}
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Manage Reservations
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									Monitor real-time room availability and approve incoming reservation requests.
								</p>
							</div>
							<div className="flex flex-wrap gap-2 sm:gap-3">
								<button onClick={() => fetchReservations(true)} className="btn btn-outline rounded-full" title="Refresh List">
									<FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
								</button>
								<button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
									Back
								</button>
							</div>
						</div>
					</div>

					<section className="rounded-[1.5rem] border border-black/5 bg-white/80 p-5 shadow-lg sm:rounded-[2rem] sm:p-7">
						<h2 className="text-xl font-black text-slate-900">Maintenance schedule</h2>
						<p className="mt-1 text-sm text-slate-600">Blocked dates will be unavailable to customers when they make a reservation.</p>
						{maintenanceError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{maintenanceError}</p>}
						<form onSubmit={addMaintenance} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<label className="form-control">
								<span className="label-text mb-1">Start date</span>
								<input type="date" className="input input-bordered" value={maintenanceStart} onChange={(event) => setMaintenanceStart(event.target.value)} required />
							</label>
							<label className="form-control">
								<span className="label-text mb-1">End date</span>
								<input type="date" min={maintenanceStart || undefined} className="input input-bordered" value={maintenanceEnd} onChange={(event) => setMaintenanceEnd(event.target.value)} required />
							</label>
							<label className="form-control lg:col-span-1">
								<span className="label-text mb-1">Reason (optional)</span>
								<input type="text" maxLength={300} className="input input-bordered" value={maintenanceReason} onChange={(event) => setMaintenanceReason(event.target.value)} placeholder="e.g. Pool cleaning" />
							</label>
							<div className="flex items-end">
								<button type="submit" disabled={maintenanceLoading} className="btn btn-black w-full rounded-full">
									{maintenanceLoading ? "Saving..." : "Block dates"}
								</button>
							</div>
						</form>
						{maintenancePeriods.length > 0 && (
							<ul className="mt-4 divide-y divide-slate-200">
								{maintenancePeriods.map((period) => (
									<li key={period.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
										<span className="font-semibold text-slate-800">
											{period.start_date} – {period.end_date}{period.reason ? ` · ${period.reason}` : ""}
										</span>
										<button type="button" onClick={() => deleteMaintenance(period)} className="btn btn-error btn-outline btn-xs rounded-full">Remove</button>
									</li>
								))}
							</ul>
						)}
					</section>

					<div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{loading ? (
							<div className="col-span-full h-64 flex items-center justify-center">
								<span className="loading loading-spinner loading-lg"></span>
							</div>
						) : reservations.length === 0 ? (
							<div className="p-20 text-center rounded-[2rem] border-2 border-dashed border-black/10 bg-white/30 backdrop-blur">
								No reservations found.
							</div>
						) : (
							reservations.map((res) => {
								const reservationStatus = res.status || "pending";
								return (
								<div key={res.id} className="min-w-0 rounded-[1.5rem] border border-black/5 bg-white/70 p-4 shadow-xl flex flex-col justify-between backdrop-blur transition-all hover:shadow-2xl sm:p-6">
									<div className="space-y-3">
										<div className="flex items-center gap-3 border-b border-black/5 pb-3">
											<div className="h-10 w-10 overflow-hidden rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800 text-xs shadow-inner shrink-0">
												{res.profiles?.avatar_url ? (
													<img src={res.profiles.avatar_url} className="h-full w-full object-cover" alt="Guest" />
												) : (
											getInitials(reservationGuestName(res))
												)}
											</div>
											<h3 className="font-bold text-lg truncate">
										{reservationGuestName(res)}
									</h3>
								</div>
								{res.guest_email && (
									<div className="rounded-xl bg-base-200/60 px-3 py-2 text-xs text-base-content/70">
										<p>{res.guest_email}</p>
										<p>{res.guest_phone}</p>
									</div>
								)}
										<p className="text-sm opacity-70 flex items-center gap-2">
											<FiCalendar /> {res.check_in} to {res.check_out}
										</p>
										<p className="text-sm font-medium mt-1">
											Package: <span className="text-primary">{res.room_type}</span>
										</p>
										<p className="text-sm font-bold mt-1 text-primary">
											Total: P{res.total_price?.toLocaleString()}
										</p>
										<div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
											<p className="font-bold">
												Payment: {{
													checkout_pending: "Checkout pending",
													down_payment_paid: "Down payment + deposit received",
													fully_paid: "Fully paid",
													refunded: "Refunded",
												}[res.payment_status] || "Unpaid"}
											</p>
											<p className="mt-1 text-[10px] text-amber-800">Manual transfers require separate staff verification.</p>
											<p className="mt-1">Received: ₱{Number(res.amount_paid || 0).toLocaleString()}</p>
											<p>Balance due: ₱{Number(res.payment_status === "fully_paid" ? 0 : res.balance_due || 0).toLocaleString()}</p>
											{res.security_deposit_amount > 0 && (
												<p>Refundable security deposit: ₱{Number(res.security_deposit_amount).toLocaleString()}</p>
											)}
										</div>
									</div>
									<div className="mt-6 pt-4 border-t border-black/5 flex flex-col gap-3">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<span className={[
												"badge uppercase text-[10px] font-bold",
												reservationStatus === "confirmed"
													? "badge-success text-white"
													: ["cancelled", "denied"].includes(reservationStatus)
														? "badge-error text-white"
														: "badge-warning"
											].join(" ")}>
													{reservationStatus}
											</span>
													{canManageReservations && (
												<div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
															{reservationStatus === "pending" && (
																<>
																	<button
																		onClick={() => updateStatus(res.id, "confirmed")}
																		disabled={updatingReservationId !== null}
																		className="btn btn-sm rounded-full btn-success text-white"
																		title="Accept reservation"
																	>
																		<FiCheckCircle /> Accept
																	</button>
																	<button
																		onClick={() => {
																		setDenyingReservationId(res.id);
																		setRejectionReason("");
																	}}
																		disabled={updatingReservationId !== null}
																		className="btn btn-sm rounded-full btn-error btn-outline"
																		title="Reject reservation"
																	>
																		<FiXCircle /> Reject
																	</button>
																</>
															)}
															{reservationStatus === "confirmed" && (
																<button
																	onClick={() => updateStatus(res.id, "cancelled")}
																	disabled={updatingReservationId !== null}
																	className="btn btn-sm rounded-full btn-warning btn-outline"
																	title="Cancel accepted reservation"
																>
																	<FiXCircle /> Cancel
																</button>
															)}
														</div>
													)}
										</div>
									</div>
								</div>
								);
							})
						)}
					</div>
				</div>
			</div>
			{denyingReservationId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
					<form onSubmit={submitRejection} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="reject-reservation-title">
						<h2 id="reject-reservation-title" className="text-xl font-black text-slate-900">Reject reservation</h2>
						<p className="mt-2 text-sm text-slate-600">Add an optional reason. If provided, it will be included in the customer’s notification and email.</p>
						<label htmlFor="rejection-reason" className="mt-4 block text-sm font-semibold text-slate-800">Reason (optional)</label>
						<textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={300} rows={4} className="textarea textarea-bordered mt-2 w-full" placeholder="Explain why the reservation was rejected" />
						<p className="mt-1 text-right text-xs text-slate-500">{rejectionReason.length}/300</p>
						<div className="mt-4 flex justify-end gap-2">
							<button type="button" onClick={() => setDenyingReservationId(null)} className="btn btn-ghost rounded-full">Keep reservation</button>
							<button type="submit" disabled={updatingReservationId !== null} className="btn btn-error rounded-full">Reject reservation</button>
						</div>
					</form>
				</div>
			)}
		</MainLayout>
	);
};

export default ManageReservations;
