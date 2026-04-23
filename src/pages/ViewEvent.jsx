import React, { useEffect, useState, useRef } from "react";
import MainLayout from "../layouts/MainLayout";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useContext } from "react";
import { SessionContext } from "../contexts/SessionContext";
import { QRCodeSVG } from "qrcode.react";
import { FiCheckCircle, FiUserCheck, FiUsers, FiCamera, FiX } from "react-icons/fi";
import { Html5Qrcode } from "html5-qrcode";

const ViewEvent = () => {
	const { eventId } = useParams();
	const [searchParams] = useSearchParams();
	const [event, setEvent] = useState(null);
	const [loading, setLoading] = useState(true);
	const [registered, setRegistered] = useState(false);
	const [registering, setRegistering] = useState(false);
	const [registrationCount, setRegistrationCount] = useState(0);
	const [scannerOpen, setScannerOpen] = useState(false);
	const [scanStatus, setScanStatus] = useState("Starting camera...");
	const { session, profile } = useContext(SessionContext);
	const scannerRef = useRef(null);
	const scannerId = "inline-qr-reader";

	const fromScan = searchParams.get("scan") === "1";

	useEffect(() => {
		const fetchEvent = async () => {
			setLoading(true);
			const { data, error } = await supabase
				.from("events")
				.select()
				.eq("id", eventId)
				.single();

			if (error) {
				alert(error.message || error);
				setEvent(null);
			} else {
				setEvent(data);
			}
			setLoading(false);
		};

		if (eventId) fetchEvent();
	}, [eventId]);

	useEffect(() => {
		if (!eventId) return;

		const checkRegistration = async () => {
			const { count } = await supabase
				.from("registrations")
				.select("*", { count: "exact", head: true })
				.eq("event_id", eventId);
			setRegistrationCount(count || 0);

			if (session?.user?.id) {
				const { data } = await supabase
					.from("registrations")
					.select("id")
					.eq("event_id", eventId)
					.eq("profile_id", session.user.id)
					.maybeSingle();
				setRegistered(!!data);
			}
		};

		checkRegistration();
	}, [eventId, session?.user?.id]);

	useEffect(() => {
		if (fromScan && session?.user?.id && profile?.role === "client" && event && !registered && !registering) {
			handleRegister();
		}
	}, [fromScan, session?.user?.id, profile?.role, event, registered]);

	const handleRegister = async () => {
		if (!session?.user?.id || registered) return;
		setRegistering(true);

		const { error } = await supabase
			.from("registrations")
			.insert({ profile_id: session.user.id, event_id: eventId });

		if (error && !error.message.includes("duplicate")) {
			alert(error.message);
		} else {
			setRegistered(true);
			setRegistrationCount((prev) => prev + 1);
		}
		setRegistering(false);
	};

	const stopScanner = async () => {
		if (scannerRef.current) {
			try {
				if (scannerRef.current.isScanning) {
					await scannerRef.current.stop();
				}
				scannerRef.current.clear();
			} catch (err) {
				console.warn("Scanner stop error:", err);
			}
			scannerRef.current = null;
		}
		const container = document.getElementById(scannerId);
		if (container) container.innerHTML = "";
	};

	const openScanner = async () => {
		setScannerOpen(true);
		setScanStatus("Starting camera...");

		setTimeout(async () => {
			try {
				await stopScanner();
				const qr = new Html5Qrcode(scannerId);
				scannerRef.current = qr;

				await qr.start(
					{ facingMode: "environment" },
					{
						fps: 10,
						qrbox: (w, h) => {
							const size = Math.min(w, h) * 0.7;
							return { width: size, height: size };
						},
					},
					async (decodedText) => {
						setScanStatus("QR code detected!");
						await stopScanner();
						setScannerOpen(false);

						// Check if it's this event's QR
						try {
							const url = new URL(decodedText);
							const match = url.pathname.match(/\/view-event\/([^?]+)/);
							const scannedEventId = match?.[1];

							if (scannedEventId === eventId) {
								await handleRegister();
							} else {
								alert("This QR code is for a different event.");
							}
						} catch {
							alert("Could not read the QR code.");
						}
					}
				);
				setScanStatus("Camera ready. Point at the QR code.");
			} catch (err) {
				console.error(err);
				setScanStatus("Camera could not start. Allow camera access.");
			}
		}, 300);
	};

	const closeScanner = async () => {
		await stopScanner();
		setScannerOpen(false);
	};

	useEffect(() => {
		return () => {
			stopScanner();
		};
	}, []);

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-5xl">
					<div className="rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
						<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div className="max-w-2xl">
								<p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
									Event Details
								</p>
								<h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
									{event?.title || "Loading event details"}
								</h1>
								<p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
									View the full schedule, location, and QR code for this event.
								</p>
							</div>
							{profile?.role === "admin" && event && (
								<Link to={`/edit-event/${event.id}`} className="btn btn-black rounded-full">
									Edit Event
								</Link>
							)}
						</div>

						{/* Auto-registered banner */}
						{fromScan && registered && (
							<div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
								<FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
								<div>
									<p className="font-bold text-emerald-800">You've been registered!</p>
									<p className="text-sm text-emerald-600">Your attendance for this event has been recorded.</p>
								</div>
							</div>
						)}

						{/* Registered banner from inline scan */}
						{registered && !fromScan && (
							<div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
								<FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
								<div>
									<p className="font-bold text-emerald-800">You are registered for this event!</p>
									<p className="text-sm text-emerald-600">Your attendance has been recorded.</p>
								</div>
							</div>
						)}

						<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
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

										<div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
											<FiUsers className="text-amber-700 shrink-0" />
											<p className="text-sm font-bold text-amber-800">
												{registrationCount} {registrationCount === 1 ? "person" : "people"} registered
											</p>
										</div>

										{registered && (
											<div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
												<FiUserCheck /> You are registered for this event
											</div>
										)}
									</div>
								)}
							</div>

							{/* Right panel */}
							<div className="rounded-3xl border border-base-200 bg-white/90 p-6 shadow-sm">
								{/* QR Code display */}
								{!scannerOpen && (
									<>
										<p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-base-content/60">
											Scan to register for this event
										</p>
										<div className="flex flex-col items-center gap-4">
											<QRCodeSVG
												value={`${window.location.origin}/view-event/${event?.id || ""}?scan=1`}
												size={220}
												includeMargin
												className="rounded-2xl bg-white p-3 shadow-sm"
											/>
											<p className="text-center text-sm text-base-content/70">
												Scan this QR code with your phone to register for this event instantly.
											</p>
										</div>
									</>
								)}

								{/* Inline Scanner */}
								{scannerOpen && (
									<>
										<div className="flex items-center justify-between mb-4">
											<p className="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/60">
												Scanning...
											</p>
											<button onClick={closeScanner} className="btn btn-ghost btn-circle btn-sm">
												<FiX />
											</button>
										</div>
										<div className="overflow-hidden rounded-2xl bg-black">
											<div id={scannerId} />
										</div>
										<p className="mt-3 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
											{scanStatus}
										</p>
									</>
								)}
							</div>
						</div>

						<div className="mt-8 flex justify-end gap-3">
							{/* Scan QR button only for clients and only if not yet registered */}
							{profile?.role === "client" && !registered && (
								<button
									onClick={scannerOpen ? closeScanner : openScanner}
									className="btn btn-outline rounded-full"
								>
									<FiCamera />
									{scannerOpen ? "Close Scanner" : "Scan QR"}
								</button>
							)}
							<Link to="/events" className="btn btn-black rounded-full">
								Back to Events
							</Link>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ViewEvent;