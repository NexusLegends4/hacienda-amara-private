import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext";
import { QRCodeSVG } from "qrcode.react";
import { FiCheckCircle, FiShare2, FiUserCheck, FiUsers, FiX } from "react-icons/fi";

const ViewEvent = () => {
	const { eventId } = useParams();
	const [event, setEvent] = useState(null);
	const [loading, setLoading] = useState(true);
	const [registered, setRegistered] = useState(false);
	const [registering, setRegistering] = useState(false);
	const [registrationCount, setRegistrationCount] = useState(0);
	const [showShareQr, setShowShareQr] = useState(false);
	const [showSignInForm, setShowSignInForm] = useState(false);
	const [guestName, setGuestName] = useState("");
	const [guestEmail, setGuestEmail] = useState("");
	const [guestPhone, setGuestPhone] = useState("");
	const { profile } = useContext(SessionContext);
	const eventUrl = `${window.location.origin}/view-event/${eventId}`;

	useEffect(() => {
		const fetchEvent = async () => {
			setLoading(true);
			const { data, error } = await supabase
				.from("events")
				.select()
				.eq("id", eventId)
				.single();
			if (error) { alert(error.message || error); setEvent(null); }
			else setEvent(data);
			setLoading(false);
		};
		if (eventId) fetchEvent();
	}, [eventId]);

	useEffect(() => {
		if (!eventId) return;
		const checkRegistration = async () => {
			setRegistered(localStorage.getItem(`event-attendance-${eventId}`) === "signed-in");
			if (profile?.role !== "admin") return;
			const { count } = await supabase
				.from("registrations")
				.select("*", { count: "exact", head: true })
				.eq("event_id", eventId);
			setRegistrationCount(count || 0);
		};
		checkRegistration();
	}, [eventId, profile?.role]);

	const handleRegister = async (event) => {
		event.preventDefault();
		if (registered) return;
		setRegistering(true);
		const { error } = await supabase
			.from("registrations")
			.insert({
				profile_id: null,
				event_id: eventId,
				guest_name: guestName.trim(),
				guest_email: guestEmail.trim(),
				guest_phone: guestPhone.trim(),
			});
		if (error) {
			alert(error.message.includes("registrations_guest_event_email_key") ? "This email has already signed in to this event." : error.message);
		} else {
			localStorage.setItem(`event-attendance-${eventId}`, "signed-in");
			setRegistered(true);
			setRegistrationCount((prev) => prev + 1);
			setShowSignInForm(false);
		}
		setRegistering(false);
	};

	const shareEvent = async () => {
		if (navigator.share) {
			try {
				await navigator.share({ title: event?.title || "Hacienda Amara Event", text: "Join this event at Hacienda Amara.", url: eventUrl });
			} catch (error) {
				if (error.name !== "AbortError") console.error(error);
			}
			return;
		}
		await navigator.clipboard?.writeText(eventUrl);
		alert("Event link copied to your clipboard.");
	};

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-5xl">
					<div className="rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">Event Details</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									{event?.title || "Loading event details"}
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									View the full schedule and location, then sign in when you arrive—no account required.
								</p>
							</div>
							{profile?.role === "admin" && event && (
								<Link to={`/edit-event/${event.id}`} className="btn btn-black rounded-full">Edit Event</Link>
							)}
						</div>

						{registered && (
							<div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
								<FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
								<div>
									<p className="font-bold text-emerald-800">You've been registered!</p>
									<p className="text-sm text-emerald-600">Your attendance has been recorded.</p>
								</div>
							</div>
						)}

						<div className="mt-8">
							{/* Event Info */}
							<div className="rounded-3xl border border-base-200 bg-white/90 p-6 shadow-sm">
								{loading && <p>Loading event...</p>}
								{!loading && !event && <p>Event not found.</p>}
								{event && (
									<div className="space-y-4 text-sm leading-6 text-base-content/80">
										<div className="grid gap-3">
											<p><span className="font-semibold text-base-content">Start Date:</span> {event.start_date}</p>
											<p><span className="font-semibold text-base-content">End Date:</span> {event.end_date}</p>
											<p><span className="font-semibold text-base-content">Start Time:</span> {event.start_time}</p>
											<p><span className="font-semibold text-base-content">End Time:</span> {event.end_time}</p>
											<p><span className="font-semibold text-base-content">Location:</span> {event.location}</p>
										</div>
										<div className="rounded-2xl bg-base-100 p-5">
											<p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/55">Description</p>
											<p className="mt-2 text-base-content/80">{event.description || "No description provided."}</p>
										</div>
										{profile?.role === "admin" && <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
											<FiUsers className="text-amber-700 shrink-0" />
											<p className="text-sm font-bold text-amber-800">
												{registrationCount} {registrationCount === 1 ? "attendee" : "attendees"} signed in
											</p>
										</div>}
										{registered && (
											<div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
												<FiUserCheck /> You are registered for this event
											</div>
										)}
									</div>
								)}
							</div>

						</div>

						<div className="mt-8 flex flex-wrap justify-end gap-3">
							{!registered && (
								<button onClick={() => setShowSignInForm(true)} disabled={registering} className="btn btn-primary rounded-full">
									Sign In to Event
								</button>
							)}
							<button onClick={() => setShowShareQr(true)} className="btn btn-outline rounded-full">
								<FiShare2 /> Share
							</button>
							<Link to="/events" className="btn btn-black rounded-full">
								Back to Events
							</Link>
						</div>
					</div>
				</div>

				{showShareQr && event && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Share event">
						<div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
							<div className="flex items-start justify-between gap-4">
								<div><p className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/55">Share event</p><h2 className="mt-1 text-xl font-black">{event.title}</h2></div>
								<button className="btn btn-ghost btn-circle btn-sm" onClick={() => setShowShareQr(false)} aria-label="Close share dialog"><FiX /></button>
							</div>
							<div className="mt-5 flex justify-center"><QRCodeSVG value={eventUrl} size={220} includeMargin className="rounded-2xl bg-white p-3 shadow-sm" /></div>
							<p className="mt-4 text-center text-sm text-base-content/65">This QR code only opens the event page. It does not sign anyone in.</p>
							<button className="btn btn-black mt-5 w-full rounded-full" onClick={shareEvent}><FiShare2 /> Share link</button>
						</div>
					</div>
				)}

				{showSignInForm && event && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Event sign in">
						<form onSubmit={handleRegister} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
							<div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/55">Event sign in</p><h2 className="mt-1 text-xl font-black">{event.title}</h2></div><button type="button" className="btn btn-ghost btn-circle btn-sm" onClick={() => setShowSignInForm(false)} aria-label="Close sign in form"><FiX /></button></div>
							<p className="mt-3 text-sm text-base-content/65">No account is needed. Resort staff use these details to monitor attendance.</p>
							<div className="mt-5 space-y-3"><input className="input input-bordered w-full" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name" minLength="2" required /><input className="input input-bordered w-full" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email address" type="email" required /><input className="input input-bordered w-full" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Phone number" type="tel" minLength="7" required /></div>
							<button disabled={registering} className="btn btn-primary mt-5 w-full rounded-full" type="submit">{registering ? "Signing in..." : "Confirm Event Sign In"}</button>
						</form>
					</div>
				)}
			</div>
		</MainLayout>
	);
};

export default ViewEvent;
