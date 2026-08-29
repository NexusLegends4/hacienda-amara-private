import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiCheckCircle, FiXCircle, FiRefreshCw, FiTrash2 } from "react-icons/fi";

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
	const canManageReservations = ["admin", "staff"].includes(profile?.role);
	const isAdmin = profile?.role === "admin";
	const adminDisplayName =
		`${profile?.firstname || ""} ${profile?.lastname || ""}`.trim() ||
		profile?.email ||
		"Admin";

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
				.subscribe();

			return () => {
				supabase.removeChannel(channel);
			};
		}
	}, [canManageReservations]);

	const fetchReservations = async (showLoading = true) => {
		if (showLoading) setLoading(true);

		const { data, error } = await supabase
			.from("reservations")
			.select("*, profiles(firstname, lastname, avatar_url)")
			.order("created_at", { ascending: false });

		if (error) {
			alert(error.message);
		} else if (data) {
			setReservations(data);
		}

		setLoading(false);
	};

	const updateStatus = async (id, newStatus) => {
		const resToUpdate = reservations.find((reservation) => reservation.id === id);

		const { error } = await supabase
			.from("reservations")
			.update({ status: newStatus })
			.eq("id", id);

		if (error) {
			alert(error.message);
			return;
		}

		const clientName = resToUpdate ? reservationGuestName(resToUpdate) : "the client";

		alert(
			`Reservation for ${clientName} was ${newStatus === "confirmed" ? `accepted by ${adminDisplayName}` : `rejected by ${adminDisplayName}`}.`,
		);
		fetchReservations(false);
	};

	const deleteReservation = async (id) => {
		if (window.confirm("Are you sure you want to delete this reservation?")) {
			const { error } = await supabase
				.from("reservations")
				.delete()
				.eq("id", id);

			if (error) {
				alert("Error deleting: " + error.message);
			} else {
				setReservations((prev) => prev.filter((res) => res.id !== id));
			}
		}
	};

	const clearAllReservations = async () => {
		if (window.confirm("WARNING: This will permanently delete ALL reservation records. Are you sure?")) {
			setLoading(true);

			const { error } = await supabase
				.from("reservations")
				.delete()
				.neq("id", "00000000-0000-0000-0000-000000000000");

			if (error) {
				alert("Failed to clear data: " + error.message);
			} else {
				setReservations([]);
				alert("Database successfully cleared.");
			}

			setLoading(false);
		}
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Admin Dashboard
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Manage Reservations
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									Monitor real-time room availability and approve incoming reservation requests.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<button onClick={() => fetchReservations(true)} className="btn btn-outline rounded-full" title="Refresh List">
									<FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
								</button>
								{isAdmin && (
									<button onClick={clearAllReservations} className="btn btn-error btn-outline rounded-full" title="Clear All Data">
										<FiTrash2 /> Clear All
									</button>
								)}
								<button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
									Back
								</button>
							</div>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{loading ? (
							<div className="col-span-full h-64 flex items-center justify-center">
								<span className="loading loading-spinner loading-lg"></span>
							</div>
						) : reservations.length === 0 ? (
							<div className="p-20 text-center rounded-[2rem] border-2 border-dashed border-black/10 bg-white/30 backdrop-blur">
								No reservations found.
							</div>
						) : (
							reservations.map((res) => (
								<div key={res.id} className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-xl flex flex-col justify-between backdrop-blur transition-all hover:shadow-2xl">
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
									</div>
									<div className="mt-6 pt-4 border-t border-black/5 flex flex-col gap-3">
										<div className="flex items-center justify-between">
											<span className={[
												"badge uppercase text-[10px] font-bold",
												res.status === "confirmed"
													? "badge-success text-white"
													: res.status === "cancelled"
														? "badge-error text-white"
														: "badge-warning"
											].join(" ")}>
												{res.status || "pending"}
											</span>
											{isAdmin && <div className="flex gap-2">
												<button
													onClick={() => updateStatus(res.id, "confirmed")}
													className="btn btn-sm btn-circle btn-ghost text-success text-xl"
													title="Confirm"
												>
													<FiCheckCircle />
												</button>
												<button
													onClick={() => updateStatus(res.id, "cancelled")}
													className="btn btn-sm btn-circle btn-ghost text-error text-xl"
													title="Cancel"
												>
													<FiXCircle />
												</button>
											</div>}
											{isAdmin && <button
												onClick={() => deleteReservation(res.id)}
												className="btn btn-sm btn-circle btn-ghost text-error text-xl"
												title="Delete"
											>
												<FiTrash2 />
											</button>}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ManageReservations;
