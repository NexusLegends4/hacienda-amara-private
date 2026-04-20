import React, { useState, useEffect, useContext, useCallback } from "react";
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

	useEffect(() => {
		if (!session) {
			navigate("/log-in");
			return;
		}
		if (profile && profile.role !== "admin") {
			navigate("/");
		}
	}, [session, profile, navigate]);

	const fetchReservations = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("reservations")
			.select("*, profiles(firstname, lastname, avatar_url)")
			.order("check_in", { ascending: true });

		if (error) {
			console.error(error);
		} else {
			setReservations(data);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		if (profile?.role === "admin") {
			fetchReservations();

			// Real-time listener for ALL changes (INSERT, UPDATE, DELETE) in reservations and profile updates
			const channel = supabase
				.channel("reservations-live")
				.on(
					"postgres_changes",
					{ event: "*", schema: "public", table: "reservations" },
					() => fetchReservations()
				)
				.on(
					"postgres_changes",
					{ event: "UPDATE", schema: "public", table: "profiles" },
					() => fetchReservations()
				)
				.subscribe();

			return () => {
				supabase.removeChannel(channel);
			};
		}
	}, [profile?.role, fetchReservations]);

	const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
	const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

	const renderCalendar = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const totalDays = daysInMonth(year, month);
		const startDay = firstDayOfMonth(year, month);
		const days = [];

		for (let i = 0; i < startDay; i++) {
			days.push(<div key={`empty-${i}`} className="h-24 border border-gray-100 bg-gray-50/30"></div>);
		}

		for (let d = 1; d <= totalDays; d++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			// Show booking on all days from check-in to check-out
			const dayBookings = reservations.filter(res => dateStr >= res.check_in && dateStr <= res.check_out);

			days.push(
				<div key={d} className="h-24 border border-gray-100 p-1 relative overflow-y-auto bg-white hover:bg-amber-50/30 transition-colors">
					<span className="text-xs font-bold text-gray-400">{d}</span>
					<div className="space-y-1 mt-1">
						{dayBookings.map(res => {
							const isConfirmed = res.status === 'confirmed' || res.status === 'Accepted';
							const isCancelled = res.status === 'cancelled' || res.status === 'Rejected';

							const statusClasses = 
								isConfirmed ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
								isCancelled ? "bg-rose-100 text-rose-800 border-rose-200 opacity-60" :
								"bg-amber-100 text-amber-800 border-amber-200";

							const StatusIcon = isConfirmed ? FiCheckCircle : (isCancelled ? FiXCircle : FiClock);

							return (
								<div key={`${res.id}-${d}`} className={`text-[9px] p-1 rounded leading-tight border ${statusClasses} flex flex-col gap-0.5`} title={`Status: ${res.status || 'pending'}`}>
									<div className="flex items-center justify-between gap-1">
										<span className="font-bold truncate max-w-[45px]">{res.room_type}</span>
										<StatusIcon className="shrink-0" />
									</div>
									<span className="truncate">{res.profiles?.firstname} {res.profiles?.lastname}</span>
								</div>
							);
						})}
					</div>
				</div>
			);
		}

		return days;
	};

	const changeMonth = (offset) => {
		setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">Admin Dashboard</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">Reservation Calendar</h1>
								<p className="mt-3 text-sm leading-6 text-base-content/75">Overview of all confirmed and pending bookings.</p>
							</div>
							<div className="flex flex-wrap items-center gap-4">
								<button onClick={() => navigate(-1)} className="btn btn-black rounded-full px-8">
									Back
								</button>
								<div className="flex items-center gap-2">
									<button onClick={() => changeMonth(-1)} className="btn btn-circle btn-ghost"><FiChevronLeft /></button>
									<h2 className="text-xl font-bold flex items-center min-w-[150px] justify-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
									<button onClick={() => changeMonth(1)} className="btn btn-circle btn-ghost"><FiChevronRight /></button>
								</div>
							</div>
						</div>
					</div>

					{/* Calendar Legend */}
					<div className="flex flex-wrap gap-4 px-4 py-2 bg-white/50 rounded-full border border-black/5 w-fit mx-auto text-[10px] font-bold uppercase tracking-wider">
						<div className="flex items-center gap-1.5 text-emerald-700">
							<div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
							<span>Accepted</span>
						</div>
						<div className="flex items-center gap-1.5 text-amber-700">
							<div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
							<span>Pending</span>
						</div>
						<div className="flex items-center gap-1.5 text-rose-700">
							<div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
							<span>Rejected</span>
						</div>
					</div>

					<div className="rounded-[1.5rem] border border-black/5 bg-white shadow-xl overflow-hidden sm:rounded-[2rem]">
						<div className="grid grid-cols-7 bg-black text-white text-center text-xs font-bold py-3 uppercase tracking-widest">
							{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
						</div>
						<div className="grid grid-cols-7">{loading ? <div className="col-span-7 h-64 flex items-center justify-center"><span className="loading loading-spinner loading-lg"></span></div> : renderCalendar()}</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default AdminReservations;