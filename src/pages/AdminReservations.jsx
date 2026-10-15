import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

const AdminReservations = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [reservations, setReservations] = useState([]);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState("");
	const [selectedDate, setSelectedDate] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	});

	const bookingsByDate = useMemo(() => {
		const grouped = new Map();
		for (const reservation of reservations) {
			if (!reservation.check_in || !reservation.check_out) continue;
			const cursor = new Date(`${reservation.check_in}T00:00:00`);
			const end = new Date(`${reservation.check_out}T00:00:00`);
			if (Number.isNaN(cursor.valueOf()) || Number.isNaN(end.valueOf()) || cursor > end) continue;
			for (; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
				const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
				const items = grouped.get(date) || [];
				items.push(reservation);
				grouped.set(date, items);
			}
		}
		return grouped;
	}, [reservations]);

	const selectedBookings = bookingsByDate.get(selectedDate) || [];

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}
		if (profile && !["admin", "staff"].includes(profile.role)) {
			navigate("/");
		}
	}, [session, profile, navigate]);

	const fetchReservations = useCallback(async (showLoading = true) => {
		if (showLoading) setLoading(true);
		setFetchError("");
		const { data, error } = await supabase
			.from("reservations")
			.select("*, profiles(firstname, lastname, avatar_url)")
			.order("check_in", { ascending: true });

		if (error) {
			console.error(error);
			setFetchError("Unable to load reservations for the calendar. Check your connection and try again.");
		} else {
			setReservations(data);
		}
		if (showLoading) setLoading(false);
	}, []);

	useEffect(() => {
		if (["admin", "staff"].includes(profile?.role)) {
			fetchReservations();

			// Real-time listener for ALL changes (INSERT, UPDATE, DELETE) in reservations and profile updates
			const channel = supabase
				.channel("reservations-live")
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
	}, [profile?.role, fetchReservations]);

	const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
	const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

	const reservationGuestName = (reservation) =>
		`${reservation.profiles?.firstname || ""} ${reservation.profiles?.lastname || ""}`.trim() ||
		reservation.guest_name ||
		"Guest";

	const renderCalendar = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const totalDays = daysInMonth(year, month);
		const startDay = firstDayOfMonth(year, month);
		const days = [];

		for (let i = 0; i < startDay; i++) {
			days.push(<div key={`empty-${i}`} aria-hidden="true" className="min-h-20 border border-gray-100 bg-gray-50/30 sm:min-h-28"></div>);
		}

		for (let d = 1; d <= totalDays; d++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			const dayBookings = bookingsByDate.get(dateStr) || [];
			const isSelected = selectedDate === dateStr;
			const statuses = new Set(dayBookings.map(({ status }) => String(status || "pending").toLowerCase()));

			days.push(
				<button
					key={d}
					type="button"
					onClick={() => setSelectedDate(dateStr)}
					aria-pressed={isSelected}
					aria-label={`${dateStr}, ${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"}`}
					className={`min-h-20 border border-gray-100 p-1.5 text-left align-top transition hover:z-10 hover:bg-amber-50 hover:shadow-inner focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-600 sm:min-h-28 sm:p-2 ${isSelected ? "bg-amber-100 ring-2 ring-inset ring-amber-600" : "bg-white"}`}
				>
					<span className={`text-xs font-bold sm:text-sm ${isSelected ? "text-amber-900" : "text-gray-500"}`}>{d}</span>
					{dayBookings.length > 0 && (
						<div className="mt-1.5 flex flex-wrap items-center gap-1" aria-hidden="true">
							{statuses.has("confirmed") || statuses.has("accepted") ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : null}
							{statuses.has("pending") ? <span className="h-2 w-2 rounded-full bg-amber-500" /> : null}
							{statuses.has("cancelled") || statuses.has("denied") || statuses.has("rejected") ? <span className="h-2 w-2 rounded-full bg-rose-500" /> : null}
							<span className="ml-0.5 text-[10px] font-semibold text-slate-600">{dayBookings.length}</span>
						</div>
					)}
					{dayBookings.length > 0 && (
						<div className="mt-1 hidden space-y-1 sm:block">
							{dayBookings.slice(0, 2).map((reservation) => (
								<div key={reservation.id} className="truncate rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-700" title={`${reservationGuestName(reservation)} — ${reservation.room_type}`}>
									{reservationGuestName(reservation)}
								</div>
							))}
							{dayBookings.length > 2 && <span className="text-[10px] text-slate-500">+{dayBookings.length - 2} more</span>}
						</div>
					)}
				</button>
			);
		}

		return days;
	};

	const changeMonth = (offset) => {
		const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
		setCurrentDate(nextMonth);
		setSelectedDate(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`);
	};

	const bookingStatus = (status) => {
		const normalized = String(status || "pending").toLowerCase();
		if (["confirmed", "accepted"].includes(normalized)) {
			return { label: "Confirmed", classes: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: FiCheckCircle };
		}
		if (["cancelled", "rejected"].includes(normalized)) {
			return { label: "Cancelled", classes: "border-rose-200 bg-rose-50 text-rose-800", Icon: FiXCircle };
		}
		return { label: "Pending", classes: "border-amber-200 bg-amber-50 text-amber-800", Icon: FiClock };
	};

	const bookingTime = (reservation) => {
		const times = {
			"Day Time (9 Hours)": "9:00 AM–6:00 PM",
			"Night Time (9 Hours)": "9:00 PM–6:00 AM",
			"Overnight (21 Hours)": "9:00 AM–6:00 AM next day",
		};
		return times[reservation.room_type] || "Time not specified";
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
												<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
													{profile?.role === "staff" ? "Staff Dashboard" : "Admin Dashboard"}
												</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">Reservation Calendar</h1>
												<p className="mt-3 text-sm leading-6 text-base-content/75">Overview of pending, accepted, and cancelled bookings.</p>
							</div>
							<div className="flex flex-wrap items-center gap-4">
								<button onClick={() => navigate(-1)} className="btn btn-black rounded-full px-8">
									Back
								</button>
								<div className="flex items-center gap-2">
									<button onClick={() => changeMonth(-1)} className="btn btn-circle btn-ghost"><FiChevronLeft /></button>
									<h2 className="text-center text-lg font-bold sm:min-w-[150px] sm:text-xl">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
									<button onClick={() => changeMonth(1)} className="btn btn-circle btn-ghost"><FiChevronRight /></button>
								</div>
							</div>
						</div>
					</div>

					<div className="mx-auto flex w-fit flex-wrap gap-4 rounded-full border border-black/5 bg-white/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider">
						<div className="flex items-center gap-1.5 text-emerald-700">
							<div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
							<span>Confirmed</span>
						</div>
						<div className="flex items-center gap-1.5 text-amber-700">
							<div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
							<span>Pending</span>
						</div>
						<div className="flex items-center gap-1.5 text-rose-700">
							<div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
							<span>Cancelled</span>
						</div>
					</div>

					{fetchError && (
						<div role="alert" className="alert alert-error rounded-2xl">
							<span>{fetchError}</span>
							<button type="button" className="btn btn-sm" onClick={fetchReservations}>Try again</button>
						</div>
					)}

					<div className="rounded-[1.5rem] border border-black/5 bg-white shadow-xl overflow-hidden sm:rounded-[2rem]">
						<div className="overflow-x-auto">
							<div className="grid grid-cols-7 bg-black py-3 text-center text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs sm:tracking-widest min-w-[500px]">
								{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
							</div>
							<div className="grid grid-cols-7 min-w-[500px]">{loading ? <div className="col-span-7 flex h-64 items-center justify-center"><span className="loading loading-spinner loading-lg" aria-label="Loading reservations" /></div> : renderCalendar()}</div>
						</div>
					</div>

					<section aria-live="polite" className="rounded-[1.5rem] border border-black/5 bg-white/80 p-5 shadow-lg sm:rounded-[2rem] sm:p-7">
						<h2 className="text-xl font-black text-slate-900">Bookings on {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
						{selectedBookings.length === 0 ? (
							<p className="mt-3 text-sm text-slate-600">No reservations are scheduled for this date.</p>
						) : (
							<ul className="mt-4 space-y-3">
								{selectedBookings.map((reservation) => {
									const status = bookingStatus(reservation.status);
									const StatusIcon = status.Icon;
									return (
										<li key={reservation.id} className="rounded-2xl border border-slate-200 p-4">
											<div className="flex flex-wrap items-start justify-between gap-3">
												<div>
													<p className="font-bold text-slate-900">{reservationGuestName(reservation)}</p>
													<p className="mt-1 text-sm text-slate-600">{reservation.room_type} · {reservation.guests || "—"} guests</p>
												</div>
												<span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.classes}`}>
													<StatusIcon aria-hidden="true" />{status.label}
												</span>
											</div>
											<p className="mt-3 text-sm text-slate-600">
												{reservation.check_in} – {reservation.check_out} · {bookingTime(reservation)}
											</p>
											{reservation.guest_phone && <p className="mt-1 text-sm text-slate-600">Contact: {reservation.guest_phone}</p>}
										</li>
									);
								})}
							</ul>
						)}
					</section>
				</div>
			</div>
		</MainLayout>
	);
};

export default AdminReservations;
