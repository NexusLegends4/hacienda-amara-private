import React, { useState, useMemo, useContext, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext.jsx";
import { FiCalendar, FiUsers, FiInfo, FiCheckCircle, FiXCircle } from "react-icons/fi";

const PH_HOLIDAYS_2026 = [
	"2026-01-01", "2026-02-17", "2026-03-20", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-09",
	"2026-05-01", "2026-06-12", "2026-08-21", "2026-08-31", "2026-11-01", "2026-11-02",
	"2026-11-30", "2026-12-08", "2026-12-24", "2026-12-25", "2026-12-30", "2026-12-31",
];

const isWeekendOrHoliday = (dateStr) => {
	if (!dateStr) return false;
	const day = new Date(dateStr + "T00:00:00").getDay();
	return [0, 5, 6].includes(day) || PH_HOLIDAYS_2026.includes(dateStr);
};

const isPhilippinePhoneNumber = (phone) => /^(?:09\d{9}|639\d{9})$/.test(phone);
const dateKey = (date) => [
	date.getFullYear(),
	String(date.getMonth() + 1).padStart(2, "0"),
	String(date.getDate()).padStart(2, "0"),
].join("-");

const Reservations = () => {
	const { profile } = useContext(SessionContext);
	const navigate = useNavigate();
	const [packages, setPackages] = useState([]);
	const [packageLoading, setPackageLoading] = useState(true);
	const [date, setDate] = useState("");
	const [guests, setGuests] = useState(20);
	const [guestName, setGuestName] = useState(null);
	const [guestEmail, setGuestEmail] = useState(null);
	const [guestPhone, setGuestPhone] = useState(null);
	const [selectedPackageId, setSelectedPackageId] = useState("");
	const [loading, setLoading] = useState(false);
	const [reservedBookings, setReservedBookings] = useState([]);
	const [maintenancePeriods, setMaintenancePeriods] = useState([]);
	const [availabilityLoading, setAvailabilityLoading] = useState(true);
	const [availabilityError, setAvailabilityError] = useState("");
	const [calendarMonth, setCalendarMonth] = useState(() => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1);
	});
	const [reservationConflict, setReservationConflict] = useState(false);
	const [cancelDate, setCancelDate] = useState("");
	const [cancelEmail, setCancelEmail] = useState(null);
	const [cancelPhone, setCancelPhone] = useState(null);
	const [cancelling, setCancelling] = useState(false);

	const profileName = [profile?.firstname, profile?.lastname].filter(Boolean).join(" ");
	const profileEmail = profile?.email || "";
	const profilePhone = (profile?.contact_number || "").replace(/\D/g, "").slice(0, 12);
	const bookingName = guestName ?? profileName;
	const bookingEmail = guestEmail ?? profileEmail;
	const bookingPhone = guestPhone ?? profilePhone;
	const bookingCancelEmail = cancelEmail ?? profileEmail;
	const bookingCancelPhone = cancelPhone ?? profilePhone;

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
		let cancelled = false;
		const loadAvailability = async () => {
			const [bookingsResult, maintenanceResult] = await Promise.all([
				supabase.rpc("get_reserved_date_ranges"),
				supabase.rpc("get_reservation_maintenance"),
			]);
			if (cancelled) return;
			if (bookingsResult.error || maintenanceResult.error) {
				console.error("Unable to load reservation availability:", bookingsResult.error || maintenanceResult.error);
				setAvailabilityError("Availability could not be loaded. Refresh before submitting a reservation.");
				setAvailabilityLoading(false);
				return;
			}
			setAvailabilityError("");
			setReservedBookings(bookingsResult.data || []);
			setMaintenancePeriods(maintenanceResult.data || []);
			setAvailabilityLoading(false);
		};

		void loadAvailability();
		const refreshTimer = window.setInterval(loadAvailability, 60_000);
		return () => {
			cancelled = true;
			window.clearInterval(refreshTimer);
		};
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

	const isDateInMaintenance = Boolean(date && maintenancePeriods.some((period) =>
		date <= period.end_date && (checkOutDate || date) >= period.start_date,
	));
	const isDateUnavailable = isDateReserved || isDateInMaintenance;
	const isCalendarDateUnavailable = (dateString) => {
		if (!selectedPackage) {
			return maintenancePeriods.some((period) => dateString >= period.start_date && dateString <= period.end_date);
		}
		const requestedInterval = getBookingInterval(dateString, selectedPackage.name);
		if (!requestedInterval) return false;
		const requestedEndDate = dateKey(new Date(
			requestedInterval.end.getFullYear(),
			requestedInterval.end.getMonth(),
			requestedInterval.end.getDate(),
		));
		if (maintenancePeriods.some((period) =>
			dateString <= period.end_date && requestedEndDate >= period.start_date,
		)) {
			return true;
		}
		return reservedBookings.some((reservation) => {
			const existingInterval = getBookingInterval(reservation.check_in, reservation.room_type);
			return existingInterval
				&& requestedInterval.start < existingInterval.end
				&& requestedInterval.end > existingInterval.start;
		});
	};
	const calendarDays = (() => {
		const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
		const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
		return [
			...Array.from({ length: firstDay }, (_, index) => ({ key: `empty-${index}` })),
			...Array.from({ length: daysInMonth }, (_, index) => {
				const day = index + 1;
				const value = dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
				return { key: value, day, value, unavailable: isCalendarDateUnavailable(value) };
			}),
		];
	})();
	const todayDate = dateKey(new Date());

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (availabilityLoading) { alert("Checking availability. Please wait a moment."); return; }
		if (availabilityError) { alert(availabilityError); return; }
		if (pricing <= 0 || isDateUnavailable) { alert("Please select an available date."); return; }
		if (!isPhilippinePhoneNumber(bookingPhone.trim())) {
			alert("Please enter a valid Philippine mobile number: 09XXXXXXXXX or 639XXXXXXXXX.");
			return;
		}
		setLoading(true);
		const { data: reservationId, error } = await supabase.rpc("create_guest_reservation", {
			reservation_guest_name: bookingName.trim(),
			reservation_guest_email: bookingEmail.trim(),
			reservation_guest_phone: bookingPhone.trim(),
			reservation_check_in: date,
			reservation_check_out: checkOutDate,
			reservation_room_type: roomType,
			reservation_guests: Number(guests),
			reservation_total_price: pricing,
		});
		if (error) alert(error.message);
		else if (!reservationId) {
			setReservationConflict(true);
			setLoading(false);
			return;
		} else {
			setReservationConflict(false);
			alert("Reservation submitted! Resort staff will contact you for confirmation.");
			navigate(`/customer-notifications/${reservationId}`);
		}
		setLoading(false);
	};

	const handleCancelReservation = async (event) => {
		event.preventDefault();
		setCancelling(true);

		const { data, error } = await supabase.rpc("cancel_guest_reservation", {
			reservation_email: bookingCancelEmail.trim(),
			reservation_phone: bookingCancelPhone.trim(),
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
			setCancelEmail(null);
			setCancelPhone(null);
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
						<form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
							<div className="space-y-6">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="form-control sm:col-span-2 mb-4">
										<label className="label-text font-bold mb-4 block">Full Name</label> <input type="text" className="input input-bordered rounded-2xl px-4 py-3" value={bookingName} onChange={e => setGuestName(e.target.value)} required minLength="2" placeholder="Your full name" />
									</div>
									<div className="form-control">
										<label className="label-text font-bold mb-2">Email Address</label>
										<input type="email" className="input input-bordered rounded-2xl px-4" value={bookingEmail} onChange={e => setGuestEmail(e.target.value)} required placeholder="you@example.com" />
									</div>
									<div className="form-control">
										<label className="label-text font-bold mb-2">Phone Number</label>
										<input inputMode="numeric" autoComplete="tel" className="input input-bordered rounded-2xl px-4" value={bookingPhone} onChange={e => setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 12))} required minLength="11" maxLength="12" pattern="(?:09\d{9}|639\d{9})" placeholder="09XX XXX XXXX" aria-label="Philippine mobile number" />
										<p className="label-text-alt mt-1">Digits only. Use 09XXXXXXXXX or 639XXXXXXXXX.</p>
									</div>
								</div>
								<div className="pt-4">
									<div className="form-control">
										<label className="label-text font-bold mb-2 flex items-center gap-2"><FiCalendar /> Select Date</label>
										<input type="date" className="input input-bordered rounded-2xl px-4" value={date} onChange={e => setDate(e.target.value)} required min={todayDate} />
										{isDateReserved && <p className="mt-1 text-xs font-bold text-error">This date is already reserved. Choose another date.</p>}
										{isDateInMaintenance && <p className="mt-1 text-xs font-bold text-error">This date is blocked for maintenance. Choose another date.</p>}
										{reservationConflict && <p className="mt-1 text-xs font-bold text-error">The selected schedule is unavailable. Please choose another date.</p>}
										{availabilityLoading && <p role="status" className="mt-1 text-xs text-slate-600">Checking reservation availability…</p>}
										{availabilityError && <p role="alert" className="mt-1 text-xs font-bold text-error">{availabilityError}</p>}
										<div className="mt-4 rounded-2xl border border-black/10 bg-white/80 p-4">
											<div className="mb-3 flex items-center justify-between gap-2">
												<button
													type="button"
													onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
													className="btn btn-ghost btn-sm btn-circle"
													aria-label="Previous month"
												>‹</button>
												<p className="font-bold text-slate-900">
													{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
												</p>
												<button
													type="button"
													onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
													className="btn btn-ghost btn-sm btn-circle"
													aria-label="Next month"
												>›</button>
											</div>
											<div className="grid grid-cols-7 gap-1 text-center">
												{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
													<span key={dayName} className="py-1 text-[0.65rem] font-bold uppercase text-slate-500">{dayName}</span>
												))}
												{calendarDays.map((calendarDay) => calendarDay.day ? (
													<button
														key={calendarDay.key}
														type="button"
														disabled={availabilityLoading || calendarDay.value < todayDate || calendarDay.unavailable || Boolean(availabilityError)}
														onClick={() => {
															setDate(calendarDay.value);
															setReservationConflict(false);
														}}
														aria-label={`${calendarDay.value}${calendarDay.unavailable ? ", unavailable" : ", available"}`}
														aria-pressed={date === calendarDay.value}
														className={`aspect-square rounded-lg text-sm font-semibold transition ${
															calendarDay.value < todayDate || calendarDay.unavailable
																? "cursor-not-allowed bg-slate-200 text-slate-400 line-through"
																: date === calendarDay.value
																	? "bg-emerald-700 text-white"
																	: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
														}`}
													>{calendarDay.day}</button>
												) : <span key={calendarDay.key} />)}
											</div>
											<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
												<span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-100" />Available</span>
												<span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />Booked / maintenance</span>
											</div>
										</div>
										{date && (
											<p className={`mt-1 text-xs font-bold ${isExpensive ? "text-rose-600" : "text-emerald-600"}`}>
												{isExpensive ? "Weekend / Holiday rate applies" : "Weekday rate applies (including February 25)"}
											</p>
										)}
									</div>
								</div>

								<div className="pt-4">
									<div className="form-control">
										<label className="label-text font-bold mb-2">Select Package</label>
									</div>
									{packageLoading ? (
										<div className="flex h-12 items-center justify-center"><span className="loading loading-spinner loading-sm"></span></div>
									) : packages.length === 0 ? (
										<div className="rounded-2xl border border-dashed border-error p-4 text-sm font-semibold text-error">No active packages are available.</div>
									) : (
									<select className="select select-bordered rounded-2xl px-4" value={selectedPackageId} onChange={e => setSelectedPackageId(e.target.value)}>
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
										<input type="number" className="input input-bordered rounded-2xl" value={guests} onChange={e => setGuests(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} min="1" max="100" step="1" required />
									<p className="label-text-alt mt-1">Base rate covers {selectedPackage?.max_guests || 20} pax. ₱{Number(selectedPackage?.additional_guest_price || 0).toLocaleString()} added per extra guest. Kids 8 & below are free.</p>
								</div>
							</div>

							<div className="flex flex-col justify-between rounded-2xl bg-black/5 p-6 border border-black/5">
								<div className="space-y-3">
									<h2 className="text-xl font-bold flex items-center gap-2"><FiInfo /> Summary</h2>
									<div className="flex justify-between text-base opacity-70"><span>Package</span><span className="text-right max-w-[140px]">{roomType}</span></div>
									<div className="flex justify-between text-base opacity-70"><span>Date</span><span>{date || "—"}</span></div>
									<div className="flex justify-between text-base opacity-70"><span>Rate Type</span><span>{date ? (isWeekendOrHoliday(date) ? "Weekend/Holiday" : "Weekday (Mon-Thu)") : "—"}</span></div>
									<div className="flex justify-between text-base opacity-70"><span>Check-out</span><span>{checkOutDate || "—"}</span></div>
									<div className="flex justify-between text-base opacity-70"><span>Guests</span><span>{guests}</span></div>
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
									<div className="border-t border-black/10 pt-3 flex justify-between items-end">
										<span className="font-bold text-lg">Total Amount</span>
										<span className="text-3xl font-black">{pricing > 0 ? `₱${pricing.toLocaleString()}` : "—"}</span>
									</div>
								</div>
								<button disabled={loading || availabilityLoading || pricing === 0 || isDateUnavailable || Boolean(availabilityError)} className="btn btn-black w-full rounded-full h-14 mt-6">
									{loading ? <span className="loading loading-spinner"></span> : <><FiCheckCircle /> Confirm Reservation</>}
								</button>
							</div>
						</form>
					</div>
				</div>

				<div className="mt-8 rounded-[1.5rem] border border-rose-200 bg-rose-50/70 p-6 shadow-xl backdrop-blur sm:rounded-[2rem] sm:p-8">
					<div className="flex items-start gap-3">
						<FiXCircle className="mt-1 shrink-0 text-rose-600" />
						<div>
							<h2 className="text-xl font-bold text-rose-950">Cancel an existing reservation</h2>
							<p className="mt-1 text-sm text-rose-900/70">Enter the same date, email, and phone number used when booking.</p>
						</div>
					</div>
<form onSubmit={handleCancelReservation} className="mt-5 grid gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
							<div className="flex flex-col gap-2">
								<label className="label-text font-semibold text-rose-950">Reservation date</label>
								<input type="date" className="input input-bordered rounded-2xl bg-white text-base-content [color-scheme:light] px-4" value={cancelDate} onChange={(event) => setCancelDate(event.target.value)} required />
							</div>
							<div className="flex flex-col gap-2">
								<label className="label-text font-semibold text-rose-950">Booking email</label>
								<input type="email" className="input input-bordered rounded-2xl bg-white px-4" placeholder="Booking email" value={bookingCancelEmail} onChange={(event) => setCancelEmail(event.target.value)} required />
							</div>
							<div className="flex flex-col gap-2">
								<label className="label-text font-semibold text-rose-950">Booking phone</label>
								<input type="tel" className="input input-bordered rounded-2xl bg-white px-4" placeholder="Booking phone" value={bookingCancelPhone} onChange={(event) => setCancelPhone(event.target.value)} required />
							</div>
							<div className="lg:col-start-4 lg:row-span-3 self-end pt-12 md:col-span-3 lg:col-span-1">
								<button type="submit" disabled={cancelling} className="btn btn-error rounded-full text-white h-[44px] w-full">
									{cancelling ? <span className="loading loading-spinner" /> : <><FiXCircle /> Cancel reservation</>}
								</button>
							</div>
						</form>
					</div>
			</div>
		</MainLayout>
	);
};

export default Reservations;