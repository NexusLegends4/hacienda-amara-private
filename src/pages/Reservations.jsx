import React, { useState, useMemo, useContext, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { FiCalendar, FiUsers, FiInfo, FiCheckCircle, FiXCircle } from "react-icons/fi";

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

const Reservations = () => {
	const { profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [packages, setPackages] = useState([]);
	const [packageLoading, setPackageLoading] = useState(true);
	const [date, setDate] = useState("");
	const [guests, setGuests] = useState(20);
	const [guestName, setGuestName] = useState("");
	const [guestEmail, setGuestEmail] = useState("");
	const [guestPhone, setGuestPhone] = useState("");
	const [selectedPackageId, setSelectedPackageId] = useState("");
	const [loading, setLoading] = useState(false);
	const [reservedBookings, setReservedBookings] = useState([]);
	const [cancelDate, setCancelDate] = useState("");
	const [cancelEmail, setCancelEmail] = useState("");
	const [cancelPhone, setCancelPhone] = useState("");
	const [cancelling, setCancelling] = useState(false);

	useEffect(() => {
		if (["admin", "staff"].includes(profile?.role)) {
			navigate(profile.role === "admin" ? "/admin-reservations" : "/manage-reservations", { replace: true });
		}
	}, [navigate, profile?.role]);

	useEffect(() => {
		const loadPackages = async () => {
			const { data, error } = await supabase
				.from("packages")
				.select("id, name, description, base_price, min_price, max_price, duration_hours, check_in_time, check_out_time, max_guests, additional_guest_price, features")
				.eq("is_active", true)
				.order("display_order", { ascending: true });

			if (error) {
				alert(error.message);
				return;
			}

			setPackages(data || []);
			setPackageLoading(false);
		};

		loadPackages();
	}, []);

	useEffect(() => {
		const loadReservedDates = async () => {
			const { data, error } = await supabase.rpc("get_reserved_date_ranges");

			if (!error) setReservedBookings(data || []);
		};

		loadReservedDates();
	}, []);

	const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) || packages[0] || null;
	const roomType = selectedPackage?.name || "";
	const bookingWindows = useMemo(() => Object.fromEntries(
		packages.map((pkg) => [pkg.name, {
			start: pkg.check_in_time?.slice(0, 5) || "09:00",
			end: pkg.check_out_time?.slice(0, 5) || "18:00",
			endDateOffset: (pkg.check_out_time || "18:00") <= (pkg.check_in_time || "09:00") ? 1 : 0,
		}]),
	), [packages]);

	const getBookingInterval = (bookingDate, bookingRoomType) => {
		const window = bookingWindows[bookingRoomType];
		if (!window || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate || "")) return null;
		const start = new Date(`${bookingDate}T${window.start}:00`);
		const endDate = new Date(`${bookingDate}T00:00:00`);
		if (Number.isNaN(start.getTime()) || Number.isNaN(endDate.getTime())) return null;
		endDate.setDate(endDate.getDate() + window.endDateOffset);
		const endDateString = [
			endDate.getFullYear(),
			String(endDate.getMonth() + 1).padStart(2, "0"),
			String(endDate.getDate()).padStart(2, "0"),
		].join("-");
		const end = new Date(`${endDateString}T${window.end}:00`);
		if (Number.isNaN(end.getTime())) return null;
		return { start, end };
	};

	const isDateReserved = packages.length > 0 && selectedPackage ? (() => {
		const selectedInterval = getBookingInterval(date, selectedPackage.name);
		if (!selectedInterval) return false;

		return reservedBookings.some((reservation) => {
			const existingInterval = getBookingInterval(reservation.check_in, reservation.room_type);
			return existingInterval && selectedInterval.start < existingInterval.end && selectedInterval.end > existingInterval.start;
		});
	})() : false;

	const pricing = useMemo(() => {
		if (!date || !selectedPackage) return 0;
		const extraGuests = Math.max(0, guests - Number(selectedPackage.max_guests || 20));
		// Use max_price for weekends/holidays, base_price (min_price) for weekdays
		const isWeekendHoliday = isWeekendOrHoliday(date);
		const basePrice = isWeekendHoliday ? Number(selectedPackage.max_price || 0) : Number(selectedPackage.base_price || 0);
		return basePrice + extraGuests * Number(selectedPackage.additional_guest_price || 0);
	}, [date, selectedPackage, guests]);

	const checkOutDate = selectedPackage ? (() => {
		if (!date) return null;
		const window = bookingWindows[selectedPackage.name];
		if (!window) return null;
		const checkout = new Date(`${date}T00:00:00`);
		checkout.setDate(checkout.getDate() + window.endDateOffset);
		return [
			checkout.getFullYear(),
			String(checkout.getMonth() + 1).padStart(2, "0"),
			String(checkout.getDate()).padStart(2, "0"),
		].join("-");
	})() : null;

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (pricing <= 0 || isDateReserved) { alert("Please select an available date."); return; }
		setLoading(true);
		const { data: reservationId, error } = await supabase.rpc("create_guest_reservation", {
			reservation_guest_name: guestName.trim(),
			reservation_guest_email: guestEmail.trim(),
			reservation_guest_phone: guestPhone.trim(),
			reservation_check_in: date,
			reservation_check_out: checkOutDate,
			reservation_room_type: roomType,
			reservation_guests: Number(guests),
			reservation_total_price: pricing,
		});
		if (error) alert(error.message);
		else if (!reservationId) alert("That time slot is already booked. Please choose another schedule.");
		else {
			alert("Reservation submitted! Resort staff will contact you for confirmation.");
			navigate(`/guest-notifications/${reservationId}`);
		}
		setLoading(false);
	};

	const handleCancelReservation = async (event) => {
		event.preventDefault();
		setCancelling(true);

		const { data, error } = await supabase.rpc("cancel_guest_reservation", {
			reservation_email: cancelEmail.trim(),
			reservation_phone: cancelPhone.trim(),
			reservation_check_in: cancelDate,
		});

		if (error) {
			alert(error.message);
		} else if (!data) {
			alert("No active reservation matched those details.");
		} else {
			alert("Your reservation was cancelled. The date is now available again.");
			setReservedBookings((current) => current.filter((reservation) =>
				cancelDate < reservation.check_in || cancelDate > reservation.check_out,
			));
			setCancelDate("");
			setCancelEmail("");
			setCancelPhone("");
		}

		setCancelling(false);
	};

	const isExpensive = date ? isWeekendOrHoliday(date) : null;
	const formatTime = (time) => {
		if (!time) return "—";
		const [hours, minutes] = time.slice(0, 5).split(":");
		const hour = Number(hours);
		const suffix = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${suffix}`;
	};

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
									<span className="font-bold text-amber-700 block mt-2">Rates and guest limits update automatically when packages change.</span>
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
									{isDateReserved && <p className="mt-1 text-xs font-bold text-error">This date is already reserved. Choose another date.</p>}
									{date && (
										<p className={`mt-1 text-xs font-bold ${isExpensive ? "text-rose-600" : "text-emerald-600"}`}>
											{isExpensive ? "Weekend / Holiday rate applies" : "Weekday rate applies"}
										</p>
									)}
								</div>

								<div className="form-control">
									<label className="label-text font-bold mb-2">Select Package</label>
									{packageLoading ? (
										<div className="flex h-12 items-center justify-center"><span className="loading loading-spinner loading-sm"></span></div>
									) : packages.length === 0 ? (
										<div className="rounded-2xl border border-dashed border-error p-4 text-sm font-semibold text-error">No active packages are available.</div>
									) : (
									<select className="select select-bordered rounded-2xl" value={selectedPackageId} onChange={e => setSelectedPackageId(e.target.value)}>
										{packages.map((pkg) => (
											<option key={pkg.id} value={pkg.id}>{pkg.name}</option>
										))}
									</select>
									)}
									{selectedPackage && (
										<div className="mt-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs space-y-1">
											<p className="font-bold text-amber-800 uppercase tracking-wider">Package Details</p>
											<p className="text-slate-600">{selectedPackage.description || "No description available."}</p>
											<p className="text-slate-600">Schedule: <strong>{formatTime(selectedPackage.check_in_time)} – {formatTime(selectedPackage.check_out_time)}</strong> ({selectedPackage.duration_hours} hours)</p>
											<p className="text-slate-600">Included guests: <strong>{selectedPackage.max_guests}</strong> · Extra guest: <strong>₱{Number(selectedPackage.additional_guest_price).toLocaleString()}/head</strong></p>
											{selectedPackage.features?.length > 0 && (
												<ul className="list-disc pl-4 text-slate-600">
													{selectedPackage.features.map((feature) => <li key={feature}>{feature}</li>)}
												</ul>
											)}
											{date && (
												<div className="mt-2 border-t border-amber-100 pt-2">
													<p className="font-bold text-amber-800">Selected Rate</p>
													<p className="text-slate-600">Rate Type: <strong>{isWeekendOrHoliday(date) ? "Weekend/Holiday" : "Weekday (Mon-Thu)"}</strong></p>
													<p className="text-slate-600">Base: <strong>₱{Number(isWeekendOrHoliday(date) ? selectedPackage.max_price : selectedPackage.base_price).toLocaleString()}</strong> · Min–Max: <strong>₱{Number(selectedPackage.min_price).toLocaleString()} – ₱{Number(selectedPackage.max_price).toLocaleString()}</strong></p>
												</div>
											)}
										</div>
									)}
								</div>

								<div className="form-control">
									<label className="label-text font-bold mb-2 flex items-center gap-2"><FiUsers /> Number of Guests</label>
									<input type="number" className="input input-bordered rounded-2xl" value={guests} onChange={e => setGuests(Number(e.target.value))} min="1" max="70" required />
									<p className="label-text-alt mt-1">Base rate covers {selectedPackage?.max_guests || 20} pax. ₱{Number(selectedPackage?.additional_guest_price || 0).toLocaleString()} added per extra guest. Kids 8 & below are free.</p>
								</div>
							</div>

							<div className="flex flex-col justify-between rounded-3xl bg-black/5 p-8 border border-black/5">
								<div className="space-y-4">
									<h2 className="text-xl font-bold flex items-center gap-2"><FiInfo /> Summary</h2>
									<div className="flex justify-between text-sm opacity-70"><span>Package</span><span className="text-right max-w-[140px]">{roomType}</span></div>
									<div className="flex justify-between text-sm opacity-70"><span>Date</span><span>{date || "—"}</span></div>
									<div className="flex justify-between text-sm opacity-70"><span>Rate Type</span><span>{date ? (isWeekendOrHoliday(date) ? "Weekend/Holiday" : "Weekday (Mon-Thu)") : "—"}</span></div>
									<div className="flex justify-between text-sm opacity-70"><span>Check-out</span><span>{checkOutDate || "—"}</span></div>
									<div className="flex justify-between text-sm opacity-70"><span>Guests</span><span>{guests}</span></div>
									{date && selectedPackage && (
										<div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm">
											<div className="flex justify-between"><span>Base Rate ({isWeekendOrHoliday(date) ? "Weekend/Holiday" : "Weekday"})</span><span>₱{Number(isWeekendOrHoliday(date) ? selectedPackage.max_price : selectedPackage.base_price).toLocaleString()}</span></div>
											{(selectedPackage && guests > Number(selectedPackage.max_guests || 20)) && (
												<div className="flex justify-between text-amber-700">
													<span>Extra pax ({guests - Number(selectedPackage.max_guests || 20)} × ₱{Number(selectedPackage.additional_guest_price || 0).toLocaleString()})</span>
													<span>₱{((guests - Number(selectedPackage.max_guests || 20)) * Number(selectedPackage.additional_guest_price || 0)).toLocaleString()}</span>
												</div>
											)}
										</div>
									)}
									<div className="border-t border-black/10 pt-4 flex justify-between items-end">
										<span className="font-bold">Total Amount</span>
										<span className="text-3xl font-black">{pricing > 0 ? `₱${pricing.toLocaleString()}` : "—"}</span>
									</div>
								</div>
								<button disabled={loading || pricing === 0 || isDateReserved} className="btn btn-black w-full rounded-full h-14 mt-8">
									{loading ? <span className="loading loading-spinner"></span> : <><FiCheckCircle /> Confirm Reservation</>}
								</button>
							</div>
						</form>
					</div>
				</div>

					<div className="rounded-[1.5rem] border border-rose-200 bg-rose-50/70 p-6 shadow-xl backdrop-blur sm:rounded-[2rem] sm:p-8">
						<div className="flex items-start gap-3">
							<FiXCircle className="mt-1 shrink-0 text-rose-600" />
							<div>
								<h2 className="text-xl font-bold text-rose-950">Cancel an existing reservation</h2>
								<p className="mt-1 text-sm text-rose-900/70">Enter the same date, email, and phone number used when booking.</p>
							</div>
						</div>
						<form onSubmit={handleCancelReservation} className="mt-5 grid gap-4 md:grid-cols-4">
							<label className="flex flex-col gap-2 text-sm font-semibold text-rose-950">
								<span>Reservation date</span>
								<input type="date" className="input input-bordered rounded-2xl bg-white text-base-content [color-scheme:light]" value={cancelDate} onChange={(event) => setCancelDate(event.target.value)} required />
							</label>
							<input type="email" className="input input-bordered rounded-2xl bg-white" placeholder="Booking email" value={cancelEmail} onChange={(event) => setCancelEmail(event.target.value)} required />
							<input type="tel" className="input input-bordered rounded-2xl bg-white" placeholder="Booking phone" value={cancelPhone} onChange={(event) => setCancelPhone(event.target.value)} required />
							<button type="submit" disabled={cancelling} className="btn btn-error rounded-full text-white">
								{cancelling ? <span className="loading loading-spinner" /> : <><FiXCircle /> Cancel reservation</>}
							</button>
						</form>
					</div>
			</div>
		</MainLayout>
	);
};

export default Reservations;
