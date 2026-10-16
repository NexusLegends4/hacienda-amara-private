import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
	FiAlertTriangle,
	FiCamera,
	FiCheckCircle,
	FiClock,
	FiImage,
	FiLock,
	FiRefreshCw,
	FiXCircle,
} from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import { SessionContext } from "../contexts/SessionContext";
import { supabase } from "../utils/supabase";
import { evaluateBooking, parseBookingQr } from "../utils/booking-qr";

const READER_ID = "qr-reader";
const FILE_READER_ID = "qr-file-reader";
/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

// Checks the things that make the camera impossible BEFORE we try to start it.
const getCompatibility = () => {
	const ua = navigator.userAgent || "";
	const inAppBrowser = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|; wv\)/i.test(ua);

	if (!window.isSecureContext) {
		return {
			inAppBrowser,
			blocking:
				"The camera needs a secure connection. Open this site using https:// (http://localhost also works while testing).",
		};
	}

	if (!navigator.mediaDevices?.getUserMedia) {
		return {
			inAppBrowser,
			blocking:
				"This browser can't access the camera. Please use the latest Chrome, Edge, Firefox or Safari.",
		};
	}

	return { inAppBrowser, blocking: null };
};

// html5-qrcode rejects with a plain STRING ("Error getting userMedia, error =
// NotAllowedError: ...") for camera failures, not an Error object, so we
// classify by text and also support real DOMExceptions.
const errorText = (err) =>
	typeof err === "string" ? err : `${err?.name || ""} ${err?.message || ""}`.trim();

const isPermissionDenied = (err) => /NotAllowed|Permission|denied/i.test(errorText(err));

const describeCameraError = (err) => {
	const raw = errorText(err);

	if (isPermissionDenied(err)) {
		return "Camera permission is blocked. Click the lock/camera icon in the address bar, set Camera to Allow, then press Try Again. On iPhone: Settings → Safari → Camera. On Windows/macOS also check that your browser is allowed to use the camera in the system privacy settings.";
	}
	if (/NotFound|DevicesNotFound|Requested device not found|no camera/i.test(raw)) {
		return "No camera was found on this device. Plug in a webcam, or use “Scan from image” below.";
	}
	if (/NotReadable|TrackStart|Could not start video|in use/i.test(raw)) {
		return "The camera is busy or can't be opened. Close other apps or tabs that use it (Zoom, Meet, another browser), then press Try Again.";
	}
	if (/Overconstrained|Constraint/i.test(raw)) {
		return "This camera doesn't support the requested mode. Choose a different camera from the list, or use “Scan from image”.";
	}
	if (/secure|https/i.test(raw)) {
		return "The camera needs a secure connection. Open this site using https://.";
	}
	return `The camera couldn't be started${raw ? ` (${raw})` : ""}. Press Try Again, or use “Scan from image”.`;
};

const reservationGuestName = (reservation) =>
	`${reservation.profiles?.firstname || ""} ${reservation.profiles?.lastname || ""}`.trim() ||
	reservation.guest_name ||
	"Guest";

const safeStop = async (scanner) => {
	try {
		if (scanner.isScanning) await scanner.stop();
	} catch {
		// Already stopped.
	}
	try {
		scanner.clear();
	} catch {
		// Nothing to clear.
	}
};

const TONE_STYLES = {
	success: {
		box: "border-emerald-200 bg-emerald-50 text-emerald-900",
		Icon: FiCheckCircle,
	},
	warning: {
		box: "border-amber-200 bg-amber-50 text-amber-900",
		Icon: FiClock,
	},
	error: {
		box: "border-rose-200 bg-rose-50 text-rose-900",
		Icon: FiXCircle,
	},
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const ScanQr = () => {
	const navigate = useNavigate();
	const { session, profile } = useContext(SessionContext);

	const compat = useMemo(getCompatibility, []);
	const canScan = ["admin", "staff"].includes(profile?.role);

	const [authWait, setAuthWait] = useState(true);
	const [cameraOn, setCameraOn] = useState(true);
	const [attempt, setAttempt] = useState(0);
	const [phase, setPhase] = useState("starting"); // starting | scanning | checking | result | error
	const [cameraError, setCameraError] = useState(null);
	const [cameras, setCameras] = useState([]);
	const [selectedCameraId, setSelectedCameraId] = useState("");
	const [result, setResult] = useState(null);
	const [showHelp, setShowHelp] = useState(false);

	// Chains camera start/stop so React StrictMode's double-mount (and quick
	// retries) can never leave two scanners fighting over one container.
	const lifecycleRef = useRef(Promise.resolve());

	// Give the auth session a moment to load before showing "please log in".
	useEffect(() => {
		const timer = window.setTimeout(() => setAuthWait(false), 1500);
		return () => window.clearTimeout(timer);
	}, []);

	const processScan = useCallback(
		async (rawText) => {
			setPhase("checking");
			try {
				const parsed = parseBookingQr(rawText);

				if (parsed.type === "event") {
					navigate(`/view-event/${parsed.id}${parsed.search}`);
					return;
				}

				if (parsed.type === "booking") {
					const { data, error } = await supabase
						.from("reservations")
						.select(
							"id, guest_name, guest_email, guest_phone, check_in, check_out, room_type, guests, total_price, status, profiles(firstname, lastname)",
						)
						.eq("id", parsed.id)
						.maybeSingle();

					if (error) {
						setResult({
							kind: "error",
							title: "Couldn't check this booking",
							detail: `The server returned an error: ${error.message}. Check your connection and scan again.`,
						});
					} else if (!data) {
						setResult({
							kind: "error",
							title: "Booking not found",
							detail:
								"No reservation matches this QR code. It may have been deleted, it may not be from this system, or your account may not have permission to view it.",
						});
					} else {
						setResult({ kind: "booking", reservation: data, verdict: evaluateBooking(data) });
					}
					setPhase("result");
					return;
				}

				setResult({
					kind: "error",
					title: "Unrecognized QR code",
					detail: "This isn't a Hacienda Amara booking code. Ask the guest to open their reservation page and show the QR code there.",
					raw: String(rawText ?? "").slice(0, 120),
				});
				setPhase("result");
			} catch (error) {
				console.error("Unable to process scanned QR code:", error);
				setResult({
					kind: "error",
					title: "Couldn't check this booking",
					detail: "An unexpected error occurred while checking the QR code. Check your connection and try again.",
				});
				setPhase("result");
			}
		},
		[navigate],
	);

	// Live camera scanner.
	useEffect(() => {
		if (!canScan || compat.blocking || !cameraOn) return undefined;

		let cancelled = false;
		let handled = false;

		const scanner = new Html5Qrcode(READER_ID, {
			verbose: false,
			formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
			useBarCodeDetectorIfSupported: true,
		});

		const onDecode = (text) => {
			// The callback fires many times per second; only act on the first hit.
			if (handled || cancelled) return;
			handled = true;
			setCameraOn(false); // effect cleanup stops the camera
			void processScan(text);
		};

		const scanConfig = {
			fps: 10,
			qrbox: (width, height) => {
				const size = Math.floor(Math.min(width, height) * 0.7);
				return { width: size, height: size };
			},
		};

		const startWith = (cameraConfig) =>
			scanner.start(cameraConfig, scanConfig, onDecode, () => {
				// Per-frame "no QR found" callback: intentionally ignored.
			});

		const begin = async () => {
			if (cancelled) return;
			setPhase("starting");
			setCameraError(null);

			try {
				try {
					await startWith(
						selectedCameraId
							? { deviceId: { exact: selectedCameraId } }
							: { facingMode: "environment" },
					);
				} catch (firstError) {
					// A blocked permission can't be fixed by trying another camera.
					if (selectedCameraId || cancelled || isPermissionDenied(firstError)) throw firstError;

					// Laptops/desktops often have no "environment" camera: pick one by id.
					const list = await Html5Qrcode.getCameras();
					if (!list?.length) throw firstError;
					// On phones, the first camera is usually the selfie camera. If the
					// browser hides labels before permission is granted, the rear camera
					// is commonly enumerated last, so prefer it as the mobile fallback.
					const labeledRearCamera = list.find((c) => /back|rear|environment|world/i.test(c.label));
					const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
					const preferred = labeledRearCamera || (isMobileDevice ? list[list.length - 1] : list[0]);
					await startWith({ deviceId: { exact: preferred.id } });
				}

				if (cancelled) return;
				setPhase("scanning");

				// Labels are only available once permission was granted.
				try {
					const list = await Html5Qrcode.getCameras();
					if (!cancelled) setCameras(list || []);
				} catch {
					// Camera list is a nice-to-have.
				}
			} catch (err) {
				if (cancelled) return;
				console.error("QR scanner failed to start:", err);
				setCameraError(describeCameraError(err));
				setPhase("error");
			}
		};

		const task = lifecycleRef.current.then(begin);
		lifecycleRef.current = task;

		return () => {
			cancelled = true;
			lifecycleRef.current = task.then(() => safeStop(scanner));
		};
	}, [canScan, compat.blocking, cameraOn, attempt, selectedCameraId, processScan]);

	const restartScan = () => {
		setResult(null);
		setCameraError(null);
		setCameraOn(true);
		setAttempt((n) => n + 1);
	};

	const handleCameraChange = (event) => {
		setSelectedCameraId(event.target.value);
		restartScan();
	};

	// Fallback for desktops without a camera / blocked permission.
	const handleImagePicked = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setCameraOn(false);
		setResult(null);
		setPhase("checking");

		const fileScanner = new Html5Qrcode(FILE_READER_ID);
		try {
			const text = await fileScanner.scanFile(file, false);
			await processScan(text);
		} catch (err) {
			console.error("Image scan failed:", err);
			setResult({
				kind: "error",
				title: "No QR code found in that image",
				detail: "Try a sharper, closer photo with the whole QR code in frame and good lighting.",
			});
			setPhase("result");
		} finally {
			try {
				fileScanner.clear();
			} catch {
				// ignore
			}
		}
	};

	/* ------------------------------ render parts ----------------------------- */

	const showReader = canScan && !compat.blocking && cameraOn;

	const statusText = {
		starting: "Starting camera…",
		scanning: "Point the camera at a booking QR code",
		checking: "Checking booking…",
		result: "Scan complete",
		error: "Camera unavailable",
	}[phase];

	const renderResult = () => {
		if (!result) return null;

		if (result.kind === "booking") {
			const { reservation, verdict } = result;
			const { box, Icon } = TONE_STYLES[verdict.tone];
			return (
				<div className="space-y-4">
					<div className={`flex items-start gap-3 rounded-2xl border p-5 ${box}`} role="status">
						<Icon className="mt-0.5 h-7 w-7 shrink-0" />
						<div>
							<p className="text-lg font-black">{verdict.title}</p>
							<p className="mt-1 text-sm font-medium">{verdict.detail}</p>
						</div>
					</div>

					<div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-5 text-sm sm:grid-cols-2">
						<div>
							<p className="text-xs font-bold uppercase tracking-wider text-slate-400">Guest</p>
							<p className="mt-1 font-semibold text-slate-900">{reservationGuestName(reservation)}</p>
							{reservation.guest_phone && <p className="text-slate-500">{reservation.guest_phone}</p>}
						</div>
						<div>
							<p className="text-xs font-bold uppercase tracking-wider text-slate-400">Package</p>
							<p className="mt-1 font-semibold text-slate-900">{reservation.room_type}</p>
						</div>
						<div>
							<p className="text-xs font-bold uppercase tracking-wider text-slate-400">Check-in → Check-out</p>
							<p className="mt-1 font-semibold text-slate-900">
								{reservation.check_in} → {reservation.check_out}
							</p>
						</div>
						<div>
							<p className="text-xs font-bold uppercase tracking-wider text-slate-400">Guests / Status</p>
							<p className="mt-1 font-semibold capitalize text-slate-900">
								{reservation.guests} pax · {reservation.status || "pending"}
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row">
						<button type="button" onClick={restartScan} className="btn btn-primary flex-1 rounded-full">
							<FiRefreshCw className="h-4 w-4" /> Scan Another
						</button>
						<button
							type="button"
							onClick={() => navigate("/manage-reservations")}
							className="btn btn-outline flex-1 rounded-full"
						>
							Open Manage Reservations
						</button>
					</div>
				</div>
			);
		}

		return (
			<div className="space-y-4">
				<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900" role="alert">
					<FiXCircle className="mt-0.5 h-7 w-7 shrink-0" />
					<div className="min-w-0">
						<p className="text-lg font-black">{result.title}</p>
						<p className="mt-1 text-sm font-medium">{result.detail}</p>
						{result.raw && (
							<p className="mt-2 break-all rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-rose-800">
								{result.raw}
							</p>
						)}
					</div>
				</div>
				<button type="button" onClick={restartScan} className="btn btn-primary w-full rounded-full">
					<FiRefreshCw className="h-4 w-4" /> Scan Again
				</button>
			</div>
		);
	};

	const renderGate = () => {
		if (!session) {
			if (authWait) {
				return (
					<div className="flex justify-center p-10">
						<span className="loading loading-spinner loading-lg" />
					</div>
				);
			}
			return (
				<div className="space-y-4 p-6 text-center">
					<FiLock className="mx-auto h-8 w-8 text-slate-400" />
					<p className="font-semibold text-slate-700">Please log in with a staff or admin account to scan bookings.</p>
					<button type="button" onClick={() => navigate("/log-in")} className="btn btn-primary rounded-full">
						Log in
					</button>
				</div>
			);
		}

		if (!profile) {
			return (
				<div className="flex justify-center p-10">
					<span className="loading loading-spinner loading-lg" />
				</div>
			);
		}

		if (!canScan) {
			return (
				<div className="space-y-2 p-6 text-center">
					<FiLock className="mx-auto h-8 w-8 text-slate-400" />
					<p className="font-semibold text-slate-700">The QR scanner is only available to staff and admin accounts.</p>
				</div>
			);
		}

		return null;
	};

	const gate = renderGate();

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-4xl">
					<div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-2xl backdrop-blur-xl">
						<div className="border-b border-slate-100 bg-slate-50 p-8 text-center sm:text-left md:p-10">
							<p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">QR Scanner</p>
							<h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
								Scan Booking Code
							</h1>
							<p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 md:text-base">
								Scan a guest&apos;s booking QR code to check whether the reservation is confirmed and valid today.
							</p>
						</div>

						{gate}

						{canScan && (
							<>
								{compat.blocking && (
									<div className="m-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900" role="alert">
										<FiLock className="mt-0.5 h-5 w-5 shrink-0" />
										<span>{compat.blocking} You can still use “Scan from image” below.</span>
									</div>
								)}

								{!compat.blocking && compat.inAppBrowser && (
									<div className="m-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900" role="status">
										<FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
										<span>
											You seem to be inside an in-app browser (Facebook, Messenger, etc.), which often blocks the camera. If scanning fails, open this page in Chrome or Safari.
										</span>
									</div>
								)}

								<div className={showReader ? "relative bg-black" : "hidden"}>
									<div id={READER_ID} className="min-h-[16rem] w-full overflow-hidden" />
									{phase === "starting" && (
										<div className="absolute inset-0 flex items-center justify-center bg-black/60">
											<span className="loading loading-spinner loading-lg text-white" />
										</div>
									)}
								</div>

								{showReader && (
									<div className="border-t border-slate-100 bg-white px-5 py-5 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
										{statusText}
									</div>
								)}

								{phase === "error" && cameraError && (
									<div className="m-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900" role="alert">
										<FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
										<span>{cameraError}</span>
									</div>
								)}

								{!showReader && phase === "checking" && (
									<div className="flex items-center justify-center gap-3 p-10 text-sm font-bold uppercase tracking-widest text-slate-400">
										<span className="loading loading-spinner" /> Checking booking…
									</div>
								)}

								{phase === "result" && <div className="p-5 sm:p-6">{renderResult()}</div>}

								<div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-6">
									{cameras.length > 1 && showReader && (
										<label className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
											Camera
											<select
												className="select select-bordered w-full rounded-full"
												value={selectedCameraId}
												onChange={handleCameraChange}
											>
												<option value="">Automatic</option>
												{cameras.map((camera, index) => (
									<option key={camera.id} value={camera.id}>
										{camera.label || `Camera ${index + 1}${/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && index === cameras.length - 1 ? " (rear camera)" : ""}`}
													</option>
												))}
											</select>
										</label>
									)}

									<button
										type="button"
										onClick={restartScan}
										className="btn btn-primary btn-wide self-center rounded-full"
									>
										<FiRefreshCw className="h-4 w-4" />
										{phase === "error" ? "Try Again" : "Restart Camera"}
									</button>

									<label className="btn btn-outline btn-wide cursor-pointer self-center rounded-full">
										<FiImage className="h-4 w-4" />
										Scan from image
										<input type="file" accept="image/*" className="hidden" onChange={handleImagePicked} />
									</label>

									<button
										type="button"
										onClick={() => setShowHelp((v) => !v)}
										className="btn btn-ghost btn-wide self-center rounded-full"
									>
										<FiCamera className="h-4 w-4" />
										Camera Help
									</button>
								</div>

								{showHelp && (
									<div className="border-t border-blue-100 bg-blue-50 p-6 text-left">
										<h3 className="mb-3 flex items-center gap-2 font-bold text-blue-800">
											<FiCamera className="h-5 w-5" /> Camera Access Help
										</h3>
										<ul className="list-disc space-y-2 pl-5 text-sm text-blue-700">
											<li>
												<strong>Allow camera access</strong> when the browser asks, or click the lock icon in the address bar and set Camera to Allow.
											</li>
											<li>
												The site must be opened over <strong>https://</strong> (or localhost).
											</li>
											<li>
												On a laptop, close Zoom/Meet/other tabs that may be using the webcam, and check the Windows or macOS camera privacy settings for your browser.
											</li>
											<li>
												On phones, use <strong>Chrome or Safari</strong>, not an in-app browser.
											</li>
											<li>
												No camera? Use <strong>Scan from image</strong> with a screenshot or photo of the QR code.
											</li>
										</ul>
									</div>
								)}
							</>
						)}

						<div className="flex justify-center border-t border-slate-100 bg-slate-50 p-6">
							<button type="button" onClick={() => navigate(-1)} className="btn btn-black btn-wide rounded-full">
								Back
							</button>
						</div>
					</div>
				</div>

				{/* Off-screen mount point required by html5-qrcode's image scanning. */}
				<div id={FILE_READER_ID} className="hidden" />
			</div>
		</MainLayout>
	);
};

export default ScanQr;
