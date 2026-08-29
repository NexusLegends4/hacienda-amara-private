import React, { useState, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiUsers, FiInfo, FiCheckCircle } from "react-icons/fi";

const PH_HOLIDAYS_2026 = [
	"2026-01-01", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-09",
	"2026-05-01", "2026-06-12", "2026-08-21", "2026-08-31", "2026-11-01",
	"2026-11-30", "2026-12-08", "2026-12-25", "2026-12-30", "2026-12-31",
];

const isWeekendOrHoliday = (dateStr) => {
	if (!dateStr) return false;
	const day = new Date(dateStr + "T00:00:00").getDay();
	return [0, 5, 6].includes(day) || PH_HOLIDAYS_2026.includes(dateStr);
};

const RATES = {
	"Day Time (9 Hours)": { weekday: 6999, weekend: 7999 },
	"Night Time (9 Hours)": { weekday: 7999, weekend: 8999 },
	"Overnight (21 Hours)": { weekday: 14999, weekend: 17999 },
};

const Reservations = () => {
	const navigate = useNavigate();
	const [date, setDate] = useState("");
	const [roomType, setRoomType] = useState("Day Time (9 Hours)");
	const [guests, setGuests] = useState(20);
	const [guestName, setGuestName] = useState("");
	const [guestEmail, setGuestEmail] = useState("");
	const [guestPhone, setGuestPhone] = useState("");
	const [loading, setLoading] = useState(false);

	const pricing = useMemo(() => {
		if (!date) return 0;
		const base = isWeekendOrHoliday(date) ? RATES[roomType].weekend : RATES[roomType].weekday;
		return base + Math.max(0, guests - 20) * 200;
	}, [date, roomType, guests]);

	const checkOutDate = useMemo(() => {
		if (!date) return null;
		if (roomType === "Day Time (9 Hours)") return date;
		return new Date(new Date(date + "T00:00:00").getTime() + 86400000).toISOString().split("T")[0];
	}, [date, roomType]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (pricing <= 0) { alert("Please select a valid date."); return; }
		setLoading(true);
		const { error } = await supabase.from("reservations").insert([{
			profile_id: null,
			guest_name: guestName.trim(),
			guest_email: guestEmail.trim(),
			guest_phone: guestPhone.trim(),
			check_in: date,
			check_out: checkOutDate,
			room_type: roomType,
			guests: Number(guests),
			total_price: pricing,
			status: "pending",
		}]);
		if (error) alert(error.message);
		else { alert("Reservation submitted! Resort staff will contact you for confirmation."); navigate("/"); }
		setLoading(false);
	};

	const isExpensive = date ? isWeekendOrHoliday(date) : null;

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-7xl space-y-6">
					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">Client Booking</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">Book Your Experience</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									Escape the ordinary at Hacienda Amara. Select your preferred date and package below.
									<br />
									<span className="font-bold text-amber-700 block mt-2">Rates are for 20 pax. Additional pax: ₱200/head.</span>
									<span className="text-emerald-700 font-bold italic">Kids 8 years old and below are FREE!</span>
								</p>
							</div>
							<button onClick={() => navigate(-1)} className="btn btn-black rounded-full px-8">Back</button>
						</div>
					</div>

					<div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur sm:rounded-[2rem] md:p-10">
						<div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
							No account is needed. Enter your contact details to submit a reservation, and resort staff will contact you.
						</div>
						<form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
							<div className="space-y-6">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="form-control sm:col-span-2">
										<label className="label-text font-bold mb-2">Full Name</label>
										<input type="text" className="input input-bordered rounded-2xl" value={guestName} onChange={e => setGuestName(e.target.value)} required minLength="2" placeholder="Your full name" />
									</div>
									<div className="form-control">
										<label className="label-text font-bold mb-2">Email Address</label>
										<input type="email" className="input input-bordered rounded-2xl" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} required placeholder="you@example.com" />
									</div>
									<div className="form-control">
										<label className="label-text font-bold mb-2">Phone Number</label>
										<input type="tel" className="input input-bordered rounded-2xl" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} required minLength="7" placeholder="09XX XXX XXXX" />
									</div>
								</div>
								<div className="form-control">
									<label className="label-text font-bold mb-2 flex items-center gap-2"><FiCalendar /> Select Date</label>
									<input type="date" className="input input-bordered rounded-2xl" value={date} onChange={e => setDate(e.target.value)} required min={new Date().toISOString().split("T")[0]} />
									{date && (
										<p className={`mt-1 text-xs font-bold ${isExpensive ? "text-rose-600" : "text-emerald-600"}`}>
											{isExpensive ? "Weekend / Holiday rate applies" : "Weekday rate applies"}
										</p>
									)}
								</div>

								<div className="form-control">
									<label className="label-text font-bold mb-2">Select Package</label>
									<select className="select select-bordered rounded-2xl" value={roomType} onChange={e => setRoomType(e.target.value)}>
										<option value="Day Time (9 Hours)">Day Time — 9:00 AM to 6:00 PM (9 Hours)</option>
										<option value="Night Time (9 Hours)">Night Time — 9:00 PM to 6:00 AM (9 Hours)</option>
										<option value="Overnight (21 Hours)">Overnight — 9:00 AM to 6:00 AM next day (21 Hours)</option>
									</select>
									{date && (
										<div className="mt-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs space-y-1">
											<p className="font-bold text-amber-800 uppercase tracking-wider">2026 Rates</p>
											<p className="text-slate-600">Weekday (Mon–Thu): <strong>₱{RATES[roomType].weekday.toLocaleString()}</strong></p>
											<p className="text-slate-600">Weekend/Holiday (Fri–Sun): <strong>₱{RATES[roomType].weekend.toLocaleString()}</strong></p>
										</div>
									)}
								</div>

								<div className="form-control">
									<label className="label-text font-bold mb-2 flex items-center gap-2"><FiUsers /> Number of Guests</label>
									<input type="number" className="input input-bordered rounded-2xl" value={guests} onChange={e => setGuests(Number(e.target.value))} min="1" max="70" required />
									<p className="label-text-alt mt-1">Base rate covers 20 pax. ₱200 added per extra guest. Kids 8 & below are free.</p>
								</div>
							</div>

							<div className="flex flex-col justify-between rounded-3xl bg-black/5 p-8 border border-black/5">
								<div className="space-y-4">
									<h2 className="text-xl font-bold flex items-center gap-2"><FiInfo /> Summary</h2>
									<div className="flex justify-between text-sm opacity-70"><span>Package</span><span className="text-right max-w-[140px]">{roomType}</span></div>
									<div className="flex justify-between text-sm opacity-70"><span>Date</span><span>{date || "—"}</span></div>
									<div className="flex justify-between text-sm opacity-70"><span>Check-out</span><span>{checkOutDate || "—"}</span></div>
									<div className="flex justify-between text-sm opacity-70"><span>Guests</span><span>{guests}</span></div>
									{guests > 20 && (
										<div className="flex justify-between text-sm text-amber-700">
											<span>Extra pax ({guests - 20} × ₱200)</span>
											<span>₱{((guests - 20) * 200).toLocaleString()}</span>
										</div>
									)}
									<div className="border-t border-black/10 pt-4 flex justify-between items-end">
										<span className="font-bold">Total Amount</span>
										<span className="text-3xl font-black">{pricing > 0 ? `₱${pricing.toLocaleString()}` : "—"}</span>
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
