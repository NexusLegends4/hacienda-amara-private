import React, { useState, useContext, useMemo, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiUsers, FiInfo, FiCheckCircle } from "react-icons/fi";

const Reservations = () => {
	const { session, profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [date, setDate] = useState("");
	const [roomType, setRoomType] = useState("Day Time (9 Hours)");
	const [guests, setGuests] = useState(1);
	const [loading, setLoading] = useState(false);
	// Only allow logged-in clients to access the booking page
	useEffect(() => {
		if (!session || profile?.role === "admin") {
			navigate("/");
		}
	}, [session, profile, navigate]);

	// Pricing Logic
	const pricing = useMemo(() => {
		if (!date) return 0;
		
		const selectedDate = new Date(date);
		const dayOfWeek = selectedDate.getDay(); // 0: Sun, 5: Fri, 6: Sat
		const isWeekend = [0, 5, 6].includes(dayOfWeek);

		const rates = {
			"Day Time (9 Hours)": isWeekend ? 7999 : 6999,
			"Night Time (9 Hours)": isWeekend ? 8999 : 7999,
			"Overnight (21 Hours)": isWeekend ? 17999 : 14999
		};

		let basePrice = rates[roomType] || 0;
		
		// Add ₱200 for each guest above 20
		const extraGuests = Math.max(0, guests - 20);
		const extraFees = extraGuests * 200;

		return basePrice + extraFees;
	}, [date, roomType]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!session) {
			alert("Please log in to complete your reservation.");
			navigate("/log-in");
			return;
		}

		if (pricing <= 0) {
			alert("Please select valid dates.");
			return;
		}
		setLoading(true);

		const checkOutDate = roomType === "Day Time (9 Hours)" 
			? date 
			: new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0];

		const { error } = await supabase.from("reservations").insert([
			{
				profile_id: session.user.id,
				check_in: date,
				check_out: checkOutDate,
				room_type: roomType,
				guests,
				total_price: pricing, // Matches the admin display logic
				status: "pending"
			}
		]);

		if (error) {
			alert(error.message);
		} else {
			alert("Reservation submitted! We will contact you for confirmation.");
			navigate("/");
		}
		setLoading(false);
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Client Booking
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									Book Your Experience
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									Escape the ordinary at Hacienda Amara. Select your preferred date below to check availability and see our pricing.
									<br />
									<span className="font-bold text-amber-700 block mt-2">Rates: Prices are for 20 pax. Additional pax: ₱200/head.</span>
									<span className="text-emerald-700 font-bold italic">Kids 8 years old and below are FREE!</span>
								</p>
							</div>
							<button onClick={() => navigate(-1)} className="btn btn-black rounded-full px-8">
								Back
							</button>
						</div>
					</div>

					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur sm:rounded-[2rem] md:p-10">
						<form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
							<div className="space-y-6">
								<div className="grid gap-4 sm:grid-cols-1">
									<div className="form-control">
										<label className="label-text font-bold mb-2 flex items-center gap-2"><FiCalendar /> Select Date</label>
										<input type="date" className="input input-bordered rounded-2xl" value={date} onChange={e => setDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
									</div>
								</div>
								<div className="form-control">
									<label className="label-text font-bold mb-2">Select Room / Package</label>
									<select className="select select-bordered rounded-2xl" value={roomType} onChange={e => setRoomType(e.target.value)}>
										<option value="Day Time (9 Hours)">Day Time (9:00 AM - 6:00 PM)</option>
										<option value="Night Time (9 Hours)">Night Time (9:00 PM - 6:00 AM)</option>
										<option value="Overnight (21 Hours)">Overnight (21 Hours of Stay)</option>
									</select>
								</div>
								<div className="form-control">
									<label className="label-text font-bold mb-2 flex items-center gap-2"><FiUsers /> Number of Guests</label>
									<input type="number" className="input input-bordered rounded-2xl" value={guests} onChange={e => setGuests(e.target.value)} min="1" max="70" required />
									<label className="label-text-alt mt-1">Note: Guests 8 years old and below are free (don't include in count).</label>
								</div>
							</div>

							<div className="flex flex-col justify-between rounded-3xl bg-black/5 p-8 border border-black/5">
								<div className="space-y-4">
									<h2 className="text-xl font-bold flex items-center gap-2"><FiInfo /> Summary</h2>
									<div className="flex justify-between text-sm opacity-70">
										<span>Base Rate</span>
										<span>₱{pricing.toLocaleString()}</span>
									</div>
									<div className="flex justify-between text-sm opacity-70">
										<span>Stay Type</span>
										<span>{roomType}</span>
									</div>
									<div className="flex justify-between text-sm opacity-70">
										<span>Check-out Date</span>
										<span>{date ? (roomType === "Day Time (9 Hours)" ? date : new Date(new Date(date).getTime() + 86400000).toLocaleDateString('en-CA')) : "Select a date"}</span>
									</div>
									<div className="border-t border-black/10 pt-4 flex justify-between items-end">
										<span className="font-bold">Total Amount</span>
										<span className="text-3xl font-black">₱{pricing.toLocaleString()}</span>
									</div>
								</div>
								<button disabled={loading || pricing === 0} className="btn btn-black w-full rounded-full h-14 mt-8">
									{loading ? <span className="loading loading-spinner"></span> : <><FiCheckCircle /> Confirm Reservation</>}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default Reservations;
