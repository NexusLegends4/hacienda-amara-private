import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
	FiAlertTriangle,
	FiCamera,
	FiCheckCircle,
	FiClock,
	FiLock,
	FiRefreshCw,
	FiSearch,
	FiUpload,
	FiXCircle,
} from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";
import { parseScannedQr } from "../utils/qrParser";

const READER_ID = "qr-reader";
const FILE_READER_ID = "qr-file-reader";
const CAMERA_STORAGE_KEY = "scan-qr-camera-id";

const readSavedCamera = () => {
	try {
		return localStorage.getItem(CAMERA_STORAGE_KEY) || null;
	} catch {
		return null;
	}
};

const saveCamera = (id) => {
	try {
		if (id) localStorage.setItem(CAMERA_STORAGE_KEY, id);
		else localStorage.removeItem(CAMERA_STORAGE_KEY);
	} catch {
		// Storage can be unavailable (private mode); the choice just won't be remembered.
	}
};

const IN_APP_BROWSER_RE = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|; wv\)/i;

// Turns whatever the browser / html5-qrcode throws into something a staff member can act on.
const describeCameraError = (err) => {
	const raw = err?.name ? `${err.name}: ${err.message || ""}` : String(err ?? "");
	const inApp = IN_APP_BROWSER_RE.test(navigator.userAgent || "");

	if (/NotAllowed|Permission|denied|dismissed/i.test(raw)) {
		return {
			title: "Camera permission is blocked",
			detail: "The browser did not allow this page to use the camera.",
			steps: [
				"Tap or click the lock / camera icon beside the web address and set Camera to Allow.",
				"On iPhone/iPad: Settings → Safari → Camera → Ask or Allow. On Android: Chrome → Site settings → Camera.",
				"Then press Retry Camera (or reload the page).",
				...(inApp ? ["You are in an in-app browser (Messenger, Facebook, Instagram…). Open this page in Chrome or Safari instead."] : []),
			],
		};
	}
	if (/NotFound|DevicesNotFound|no camera|Requested device not found/i.test(raw)) {
		return {
			title: "No camera found",
			detail: "This device did not report any camera.",
			steps: [
				"Plug in or enable the webcam, then press Retry Camera.",
				"Check that no privacy shutter or system setting is turning the camera off.",
				"No camera? Use the photo upload or manual code entry below instead.",
			],
		};
	}
	if (/NotReadable|TrackStart|Could not start video|in use|Starting videoinput failed/i.test(raw)) {
		return {
			title: "The camera is busy",
			detail: "Another app or browser tab is already using the camera.",
			steps: [
				"Close other apps or tabs that use the camera (Zoom, Teams, Meet, another browser).",
				"Then press Retry Camera.",
			],
		};
	}
	if (/Overconstrained|Constraint/i.test(raw)) {
		return {
			title: "That camera isn't available",
			detail: "The selected camera could not be started.",
			steps: ["Pick a different camera from the list below, or press Retry Camera."],
		};
	}
	if (/Security|secure context|insecure|https/i.test(raw)) {
		return {
			title: "Camera needs a secure (HTTPS) connection",
			detail: "Browsers only allow camera access on HTTPS pages or on localhost.",
			steps: ["Open the site using its https:// address. A plain http:// address on a network IP will not work."],
		};
	}
	if (/not supported|NotSupported|Camera streaming not supported/i.test(raw)) {
		return {
			title: "This browser can't use the camera here",
			detail: "Camera streaming isn't supported by this browser or webview.",
			steps: [
				"Use a current version of Chrome, Edge, Firefox or Safari.",
				...(inApp ? ["Open the page outside of the in-app browser."] : []),
				"Or use the photo upload / manual code entry below.",
			],
		};
	}
	return {
		title: "The camera could not be started",
		detail: raw.trim() || "Unknown camera error.",
		steps: [
			"Press Retry Camera.",
			"If it keeps failing, reload the page or try another browser.",
			"You can still check a booking with the photo upload or manual code entry below.",
		],
	};
};

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleString("en-PH", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
};

const toneStyles = {
	success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: FiCheckCircle },
	warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: FiClock },
	error: { box: "border-rose-200 bg-rose-50 text-rose-900", icon: FiXCircle },
	info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: FiAlertTriangle },
};

const validityOutcome = (row) => {
	switch (row.validity) {
		case "valid":
			return { tone: "success", title: "Valid booking", message: "Confirmed and inside the booked schedule. Guest can be checked in." };
		case "not_yet":
			return { tone: "warning", title: "Booking is not active yet", message: `Confirmed, but the schedule starts ${formatDateTime(row.starts_at)}.` };
		case "expired":
			return { tone: "error", title: "Booking has expired", message: `The schedule ended ${formatDateTime(row.ends_at)}.` };
		case "pending":
			return { tone: "warning", title: "Booking not approved yet", message: "Status is pending. Approve it under Manage Reservations before check-in." };
		case "cancelled":
			return { tone: "error", title: "Booking was cancelled or declined", message: "Do not check this guest in." };
		default:
			return { tone: "info", title: "Booking found", message: `Status: ${row.status}.` };
	}
};

// Looks up a reservation by id / access token. Returns { row } | { notFound } | { error }.
const lookupReservation = async (id) => {
	const { data, error } = await supabase.rpc("validate_reservation_qr", { reservation_token: id });
	if (error) {
		if (error.code === "42501") {
			return { error: { title: "Not allowed", message: "Your account is not allowed to validate bookings. Sign in as staff or admin." } };
		}
		if (error.code === "PGRST202" || /does not exist|could not find the function/i.test(error.message || "")) {
			return { error: { title: "Booking validation is not set up", message: "The server is missing validate_reservation_qr. Run supabase/20261011_validate_reservation_qr.sql in the Supabase SQL editor." } };
		}
		return { error: { title: "Could not check the booking", message: error.message || "The server returned an error. Check your connection and try again." } };
	}
	if (!data?.length) return { notFound: true };
	return { row: data[0] };
};

// Looks up an event. Returns { event } | { notFound } | { error }.
const lookupEvent = async (id) => {
	const { data, error } = await supabase.from("events").select("id, title").eq("id", id).maybeSingle();
	if (error) {
		// 22P02 = id is not valid for the column type, i.e. no such event.
		if (error.code === "22P02") return { notFound: true };
		return { error: { title: "Could not check the event", message: error.message || "The server returned an error." } };
	}
	if (!data) return { notFound: true };
	return { event: data };
};

const ScanQr = () => {
	const navigate = useNavigate();
	const { session, profile } = useContext(SessionContext);
	const allowed = ["admin", "staff"].includes(profile?.role);

	const [phase, setPhase] = useState("starting"); // starting | scanning | error | working | done
	const [failure, setFailure] = useState(null);
	const [outcome, setOutcome] = useState(null);
	const [cameras, setCameras] = useState([]);
	const [cameraId, setCameraId] = useState(null);
	const [permission, setPermission] = useState(null);
	const [manualCode, setManualCode] = useState("");
	const [graceOver, setGraceOver] = useState(false);

	const phaseRef = useRef("starting");
	const scannerRef = useRef(null);
	const seqRef = useRef(0);
	const chainRef = useRef(Promise.resolve());
	const handledRef = useRef(false);
	const fileInputRef = useRef(null);

	const updatePhase = useCallback((next) => {
		phaseRef.current = next;
		setPhase(next);
	}, []);

	useEffect(() => {
		const timer = window.setTimeout(() => setGraceOver(true), 1500);
		return () => window.clearTimeout(timer);
	}, []);

	const stopScanner = useCallback(async () => {
		const qr = scannerRef.current;
		scannerRef.current = null;
		if (!qr) return;
		try {
			await qr.stop();
		} catch {
			// Already stopped or never started.
		}
		try {
			qr.clear();
		} catch {
			// Nothing to clear.
		}
	}, []);

	// Decodes -> classifies -> validates. Used by camera, photo upload and manual entry.
	const handleDecoded = useCallback(
		async (decodedText) => {
			updatePhase("working");
			setFailure(null);
			setOutcome(null);

			const parsed = parseScannedQr(decodedText, window.location.origin);
			const fail = (title, message, tone = "error") => {
				setOutcome({ tone, title, message });
				updatePhase("done");
			};

			try {
				switch (parsed.type) {
					case "event": {
						const result = await lookupEvent(parsed.id);
						if (result.error) return fail(result.error.title, result.error.message);
						if (result.notFound) return fail("Event not found", "This QR points to an event that no longer exists.");
						navigate(`/view-event/${result.event.id}?scan=1`);
						return;
					}
					case "reservation":
					case "uuid": {
						const result = await lookupReservation(parsed.id);
						if (result.error) return fail(result.error.title, result.error.message);
						if (result.row) {
							setOutcome({ ...validityOutcome(result.row), reservation: result.row });
							updatePhase("done");
							return;
						}
						if (parsed.type === "uuid") {
							const eventResult = await lookupEvent(parsed.id);
							if (eventResult.event) {
								navigate(`/view-event/${eventResult.event.id}?scan=1`);
								return;
							}
						}
						return fail("No booking found", "Nothing matches this code. It may be invalid, mistyped, or from a different system.");
					}
					case "text": {
						const result = await lookupEvent(parsed.id);
						if (result.event) {
							navigate(`/view-event/${result.event.id}?scan=1`);
							return;
						}
						if (result.error) return fail(result.error.title, result.error.message);
						return fail("Unrecognized QR code", "This code is not a Hacienda Amara booking or event.");
					}
					case "booking":
						return fail(
							"This is the public booking QR",
							"This code opens the reservation page for guests. It is not a booking confirmation. Ask the guest to show the QR on their reservation page.",
							"info",
						);
					case "external":
						return fail("Link to another website", `This QR points outside Hacienda Amara (${parsed.url}), so it was not opened.`, "warning");
					default:
						return fail("Unrecognized QR code", "This code is not a Hacienda Amara booking or event.");
				}
			} catch (err) {
				const offline = /fetch|network/i.test(String(err?.message || err));
				fail(
					offline ? "No connection" : "Something went wrong",
					offline ? "Could not reach the server. Check the internet connection and scan again." : "Unexpected error while checking this code. Please scan again.",
				);
			}
		},
		[navigate, updatePhase],
	);

	const doStart = useCallback(
		async (seq, preferredId, allowRetry = true) => {
			if (seq !== seqRef.current) return;
			await stopScanner();
			if (seq !== seqRef.current) return;

			handledRef.current = false;
			setFailure(null);
			updatePhase("starting");

			const showFailure = (err) => {
				if (seq !== seqRef.current) return;
				setFailure(describeCameraError(err));
				updatePhase("error");
			};

			if (!window.isSecureContext) {
				showFailure("SecurityError: insecure context");
				return;
			}
			if (!navigator.mediaDevices?.getUserMedia) {
				showFailure("NotSupportedError: Camera streaming not supported");
				return;
			}

			let found;
			try {
				// Also triggers the browser's permission prompt and unlocks device labels.
				found = await Html5Qrcode.getCameras();
			} catch (err) {
				showFailure(err);
				return;
			}
			if (seq !== seqRef.current) return;
			if (!found?.length) {
				showFailure("NotFoundError: no camera");
				return;
			}
			setCameras(found);

			const wanted = preferredId ?? readSavedCamera();
			const saved = found.find((camera) => camera.id === wanted);
			const rear = found.find((camera) => /back|rear|environment/i.test(camera.label || ""));
			const chosen = saved || rear || (found.length === 1 ? found[0] : null);
			setCameraId(chosen ? chosen.id : null);

			const qr = new Html5Qrcode(READER_ID, {
				verbose: false,
				formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
				experimentalFeatures: { useBarCodeDetectorIfSupported: true },
			});
			scannerRef.current = qr;

			try {
				await qr.start(
					chosen ? chosen.id : { facingMode: "environment" },
					{
						fps: 10,
						qrbox: (width, height) => {
							const size = Math.max(50, Math.floor(Math.min(width, height) * 0.7));
							return { width: size, height: size };
						},
					},
					(decodedText) => {
						if (handledRef.current) return;
						handledRef.current = true;
						void stopScanner().then(() => handleDecoded(decodedText));
					},
					() => {
						// Per-frame "no QR in view" callback. Intentionally ignored.
					},
				);
			} catch (err) {
				if (scannerRef.current === qr) scannerRef.current = null;
				if (seq !== seqRef.current) return;
				// A remembered camera may have been unplugged. Fall back to automatic selection once.
				if (allowRetry && chosen && /Overconstrained|NotFound|Constraint/i.test(String(err?.name || err))) {
					saveCamera(null);
					await doStart(seq, "__auto__", false);
					return;
				}
				showFailure(err);
				return;
			}

			if (seq !== seqRef.current) {
				// Page was left (or restarted) while the camera was spinning up.
				if (scannerRef.current === qr) scannerRef.current = null;
				try {
					await qr.stop();
					qr.clear();
				} catch {
					// ignore
				}
				return;
			}
			updatePhase("scanning");
		},
		[handleDecoded, stopScanner, updatePhase],
	);

	// Serialised so React StrictMode / quick retries can never run two cameras at once.
	const startScanner = useCallback(
		(preferredId) => {
			const seq = ++seqRef.current;
			chainRef.current = chainRef.current.then(() => doStart(seq, preferredId)).catch(() => {});
			return chainRef.current;
		},
		[doStart],
	);

	useEffect(() => {
		if (!allowed) return undefined;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void startScanner();
		return () => {
			seqRef.current += 1;
			void stopScanner();
		};
	}, [allowed, startScanner, stopScanner]);

	// Tell the user up-front when permission is already blocked, and auto-retry once it is granted.
	useEffect(() => {
		if (!allowed || !navigator.permissions?.query) return undefined;
		let cancelled = false;
		let status = null;
		navigator.permissions
			.query({ name: "camera" })
			.then((result) => {
				if (cancelled) return;
				status = result;
				setPermission(result.state);
				result.onchange = () => {
					setPermission(result.state);
					if (result.state === "granted" && phaseRef.current === "error") void startScanner();
				};
			})
			.catch(() => {
				// Permissions API for "camera" is not supported by every browser (e.g. Firefox/Safari).
			});
		return () => {
			cancelled = true;
			if (status) status.onchange = null;
		};
	}, [allowed, startScanner]);

	const handleRetry = () => {
		setOutcome(null);
		void startScanner();
	};

	const handleCameraChange = (event) => {
		const id = event.target.value || null;
		saveCamera(id);
		setOutcome(null);
		void startScanner(id ?? "__auto__");
	};

	const handleFile = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		seqRef.current += 1; // cancel any camera start in flight
		await stopScanner();
		updatePhase("working");
		setFailure(null);
		setOutcome(null);

		const fileScanner = new Html5Qrcode(FILE_READER_ID, {
			verbose: false,
			formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
		});
		try {
			const text = await fileScanner.scanFile(file, false);
			await handleDecoded(text);
		} catch {
			setOutcome({
				tone: "error",
				title: "No QR code found in that image",
				message: "Use a sharp, well-lit photo where the whole QR code is visible, or enter the booking code manually.",
			});
			updatePhase("done");
		} finally {
			try {
				fileScanner.clear();
			} catch {
				// ignore
			}
		}
	};

	const handleManual = async (event) => {
		event.preventDefault();
		const value = manualCode.trim();
		if (!value) return;
		seqRef.current += 1;
		await stopScanner();
		setManualCode("");
		await handleDecoded(value);
	};

	const insecure = typeof window !== "undefined" && !window.isSecureContext;

	// ---- access gates -------------------------------------------------------------------------
	const gate = (title, body, action) => (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-4 py-10">
				<div className="mx-auto max-w-lg rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-2xl">
					<FiLock className="mx-auto text-3xl text-slate-400" />
					<h1 className="mt-4 text-2xl font-black text-slate-900">{title}</h1>
					<p className="mt-2 text-sm text-slate-500">{body}</p>
					{action}
				</div>
			</div>
		</MainLayout>
	);

	if (!session) {
		if (!graceOver) return gate("Checking your account…", "One moment.", <span className="loading loading-spinner mt-4" />);
		return gate(
			"Sign in required",
			"Only signed-in staff and admins can scan booking and event QR codes.",
			<Link to="/log-in" className="btn btn-primary mt-6 rounded-full">Log in</Link>,
		);
	}
	if (!profile) return gate("Loading your account…", "One moment.", <span className="loading loading-spinner mt-4" />);
	if (!allowed) {
		return gate(
			"Staff access only",
			"Your account does not have permission to use the QR scanner.",
			<button type="button" onClick={() => navigate(-1)} className="btn btn-black mt-6 rounded-full">Go back</button>,
		);
	}

	// ---- main UI ------------------------------------------------------------------------------
	const statusText = {
		starting: "Starting camera…",
		scanning: "Camera ready. Point it at a QR code.",
		error: "Camera is not working.",
		working: "Checking the code…",
		done: "Scan complete.",
	}[phase];

	const statusDot = {
		starting: "bg-amber-400 animate-pulse",
		scanning: "bg-emerald-500",
		error: "bg-rose-500",
		working: "bg-sky-500 animate-pulse",
		done: "bg-slate-400",
	}[phase];

	const outcomeStyle = outcome ? toneStyles[outcome.tone] : null;
	const OutcomeIcon = outcomeStyle?.icon;
	const reservation = outcome?.reservation;

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-4xl">
					<div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-2xl">
						<div className="border-b border-slate-100 bg-slate-50 p-8 text-center sm:text-left md:p-10">
							<p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">QR Scanner</p>
							<h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">Scan Booking or Event Code</h1>
							<p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 md:text-base">
								Scan a guest&apos;s booking QR to check it is valid, or an event QR to open its attendance page.
							</p>
						</div>

						{/* Camera viewport. The element must stay mounted so the scanner can attach to it. */}
						<div className="relative bg-black">
							<div id={READER_ID} className="w-full overflow-hidden [&_video]:w-full" style={{ minHeight: phase === "scanning" ? undefined : 120 }} />
							{(phase === "starting" || phase === "working") && (
								<div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
									<span className="loading loading-spinner loading-lg" />
								</div>
							)}
							{(phase === "error" || phase === "done") && (
								<div className="flex min-h-[120px] items-center justify-center px-6 py-10 text-center text-sm text-white/70">
									<FiCamera className="mr-2 shrink-0" /> Camera is off
								</div>
							)}
						</div>
						<div id={FILE_READER_ID} className="hidden" />

						<div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 bg-white px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-500" role="status" aria-live="polite">
							<span className={`inline-block h-2.5 w-2.5 rounded-full ${statusDot}`} />
							{statusText}
							{permission === "denied" && phase !== "error" && <span className="text-rose-600">Camera permission: blocked</span>}
						</div>

						{insecure && phase !== "error" && (
							<div className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-center text-sm font-semibold text-rose-800">
								<FiLock className="mr-1 inline" /> This page is not secure (HTTPS). Browsers will block the camera.
							</div>
						)}

						{phase === "error" && failure && (
							<div className="border-t border-rose-100 bg-rose-50 p-6 text-left" role="alert">
								<h2 className="flex items-center gap-2 text-lg font-black text-rose-900">
									<FiAlertTriangle className="shrink-0" /> {failure.title}
								</h2>
								<p className="mt-1 text-sm text-rose-800">{failure.detail}</p>
								<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-rose-800">
									{failure.steps.map((step) => (
										<li key={step}>{step}</li>
									))}
								</ul>
							</div>
						)}

						{outcome && (
							<div className={`border-t p-6 text-left ${outcomeStyle.box}`} role="status">
								<h2 className="flex items-center gap-2 text-xl font-black">
									<OutcomeIcon className="shrink-0" /> {outcome.title}
								</h2>
								<p className="mt-1 text-sm">{outcome.message}</p>
								{reservation && (
									<dl className="mt-4 grid gap-3 rounded-2xl bg-white/70 p-4 text-sm sm:grid-cols-2">
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Guest</dt><dd className="font-semibold text-slate-900">{reservation.guest_name}</dd></div>
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</dt><dd className="font-semibold text-slate-900">{reservation.guest_phone || "-"}</dd></div>
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Package</dt><dd className="font-semibold text-slate-900">{reservation.room_type}</dd></div>
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Guests</dt><dd className="font-semibold text-slate-900">{reservation.guests}</dd></div>
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Starts</dt><dd className="font-semibold text-slate-900">{formatDateTime(reservation.starts_at)}</dd></div>
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Ends</dt><dd className="font-semibold text-slate-900">{formatDateTime(reservation.ends_at)}</dd></div>
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Total</dt><dd className="font-semibold text-slate-900">₱{Number(reservation.total_price || 0).toLocaleString("en-PH")}</dd></div>
										<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference</dt><dd className="font-mono font-semibold text-slate-900">{String(reservation.reservation_id).slice(0, 8).toUpperCase()}</dd></div>
									</dl>
								)}
								<div className="mt-4 flex flex-wrap gap-3">
									<button type="button" onClick={handleRetry} className="btn btn-primary rounded-full"><FiRefreshCw /> Scan another</button>
									{reservation && (
										<button type="button" onClick={() => navigate("/manage-reservations")} className="btn btn-outline rounded-full">Open Manage Reservations</button>
									)}
								</div>
							</div>
						)}

						<div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-center">
							{cameras.length > 1 && (
								<label className="flex items-center gap-2 text-sm text-slate-600">
									<FiCamera className="shrink-0" />
									<select className="select select-bordered select-sm max-w-[16rem] rounded-full" value={cameraId || ""} onChange={handleCameraChange} aria-label="Choose camera">
										<option value="">Automatic (rear camera)</option>
										{cameras.map((camera, index) => (
											<option key={camera.id} value={camera.id}>{camera.label || `Camera ${index + 1}`}</option>
										))}
									</select>
								</label>
							)}
							<button type="button" onClick={handleRetry} className="btn btn-primary rounded-full">
								<FiRefreshCw className="h-4 w-4" /> Retry Camera
							</button>
						</div>

						<div className="border-t border-slate-100 p-6">
							<h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Camera not working? Other ways to check</h2>
							<div className="mt-4 grid gap-4 md:grid-cols-2">
								<div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
									<p className="text-sm font-semibold text-slate-800">Upload a photo of the QR</p>
									<p className="mt-1 text-xs text-slate-500">Works with a screenshot or photo of the guest&apos;s QR code.</p>
									<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
									<button type="button" className="btn btn-outline btn-sm mt-3 rounded-full" onClick={() => fileInputRef.current?.click()}>
										<FiUpload /> Choose image
									</button>
								</div>
								<form onSubmit={handleManual} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
									<p className="text-sm font-semibold text-slate-800">Enter a booking code or link</p>
									<p className="mt-1 text-xs text-slate-500">Paste the guest's reservation link, or the code from it.</p>
									<div className="mt-3 flex gap-2">
										<input className="input input-bordered input-sm w-full rounded-full" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Paste link or code" aria-label="Booking code or link" />
										<button type="submit" className="btn btn-black btn-sm rounded-full" disabled={!manualCode.trim()}><FiSearch /> Check</button>
									</div>
								</form>
							</div>
						</div>

						<div className="flex justify-center border-t border-slate-100 bg-slate-50 p-6">
							<button type="button" onClick={() => navigate(-1)} className="btn btn-black btn-wide rounded-full">Back</button>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ScanQr;
