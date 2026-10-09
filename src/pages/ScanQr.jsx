import { useContext, useEffect, useState, useRef } from "react";
import MainLayout from "../layouts/MainLayout";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext";
import { FiRefreshCw, FiCamera, FiLock, FiExternalLink, FiUpload, FiImage } from "react-icons/fi";

const ScanQr = () => {
	const navigate = useNavigate();
	const { session, profile } = useContext(SessionContext);
	const [status, setStatus] = useState("Requesting camera permission...");
	const [showInstructions, setShowInstructions] = useState(false);
	const [isHttps, setIsHttps] = useState(false);
	const [cameraError, setCameraError] = useState(null);
	const scannerRef = useRef(null);
	const isInitializedRef = useRef(false);

	useEffect(() => {
		// Check if we're on HTTPS or localhost
		const protocol = window.location.protocol;
		const hostname = window.location.hostname;
		// Vercel domains are always HTTPS
		const isVercel = hostname.endsWith(".vercel.app");
		const secure = protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
		setIsHttps(secure);
		
		if (!secure) {
			setStatus("Camera requires HTTPS. Please access via HTTPS or use localhost.");
		}
	}, []);

	useEffect(() => {
		if (!session || profile?.role !== "admin") return undefined;
		
		// Prevent double initialization
		if (isInitializedRef.current) {
			console.log("Scanner already initialized, skipping");
			return undefined;
		}
		isInitializedRef.current = true;
		
		let isMounted = true;
		let html5QrCode = null;
		const scannerId = "qr-reader";

		const stopScanner = async () => {
			if (html5QrCode && html5QrCode.isScanning) {
				try {
					await html5QrCode.stop();
				} catch (err) {
					console.warn("Failed to stop scanner:", err);
				}
			}
			try {
				if (html5QrCode) {
					html5QrCode.clear();
				}
			} catch (err) {
				// Ignore clear errors
			}

			const container = document.getElementById(scannerId);
			if (container) container.innerHTML = "";
		};

		const handleResult = async (decodedText) => {
			setStatus("QR code detected.");
			await stopScanner();

			if (!isMounted) return;

			try {
				const scannedUrl = decodedText.startsWith("http")
					? new URL(decodedText)
					: null;

				if (scannedUrl) {
					const pathname = scannedUrl.pathname;
					const eventId = pathname.match(/\/(?:view|edit)-event\/(.+)/)?.[1];

					if (eventId) {
						navigate(`/view-event/${eventId}${scannedUrl.search}`);
					} else {
						navigate(`${pathname}${scannedUrl.search}${scannedUrl.hash}`);
					}
					return;
				}

				navigate(`/view-event/${decodedText}?scan=1`);
			} catch {
				setStatus("Could not open the scanned QR content.");
			}
		};

		const startScanner = async (facingMode = "environment") => {
			try {
				await stopScanner();

				if (!isMounted) return;

				// First, check if we have camera permission
				try {
					const stream = await navigator.mediaDevices.getUserMedia({ 
						video: { facingMode } 
					});
					stream.getTracks().forEach(track => track.stop());
				} catch (permError) {
					if (!isMounted) return;
					if (facingMode === "environment") {
						// Try front camera as fallback
						console.log("Rear camera failed, trying front camera...");
						await startScanner("user");
						return;
					}
					if (!isMounted) return;
					setCameraError("Camera permission denied. Please allow camera access in your browser settings and refresh.");
					setStatus("Camera permission denied. Please allow camera access in your browser settings and refresh.");
					return;
				}

				html5QrCode = new Html5Qrcode("qr-reader");
				await html5QrCode.start(
					{ facingMode },
					{
						fps: 10,
						qrbox: (viewfinderWidth, viewfinderHeight) => {
							const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
							return { width: size, height: size };
						},
					},
					(decodedText) => {
						if (isMounted) handleResult(decodedText);
					},
				);
				if (isMounted) {
					setCameraError(null);
					setStatus(`Camera ready (${facingMode === "environment" ? "rear" : "front"}). Scan a QR code.`);
				}
			} catch (error) {
				console.error(error);
				if (!isMounted) return;
				if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
					if (facingMode === "environment") {
						// Try front camera as fallback
						await startScanner("user");
						return;
					}
					setCameraError("Camera permission denied. Please allow camera access in your browser settings and refresh.");
					setStatus("Camera permission denied. Please allow camera access in your browser settings and refresh.");
				} else if (error.name === "NotFoundError") {
					if (facingMode === "environment") {
						// Try front camera as fallback
						await startScanner("user");
						return;
					}
					setCameraError("No camera found. Please connect a camera and refresh.");
					setStatus("No camera found. Please connect a camera and refresh.");
				} else if (!isHttps) {
					setCameraError("Camera requires HTTPS. Please access via HTTPS or use localhost.");
					setStatus("Camera requires HTTPS. Please access via HTTPS or use localhost.");
				} else {
					if (facingMode === "environment") {
						// Try front camera as fallback
						await startScanner("user");
						return;
					}
					setCameraError("Camera could not start. Allow camera access and use HTTPS or localhost.");
					setStatus("Camera could not start. Allow camera access and use HTTPS or localhost.");
				}
			}
		};

		startScanner();

		return () => {
			isMounted = false;
			isInitializedRef.current = false;
			void stopScanner();
		};
	}, [navigate, profile?.role, session, isHttps]);

	const handleRetry = () => {
		setCameraError(null);
		setStatus("Starting camera...");
		// Trigger a re-render of the scanner
		scannerRef.current = (scannerRef.current || 0) + 1;
	};

	const handleFileUpload = async (event) => {
		const file = event.target.files[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			alert("Please select an image file (JPG, PNG, etc.)");
			return;
		}

		setStatus("Processing QR code from image...");

		try {
			// Use html5-qrcode to scan from file
			const html5QrCode = new Html5Qrcode("qr-reader-file");
			const result = await html5QrCode.scanFile(file, true);
			
			if (result) {
				setStatus("QR code detected from image.");
				await handleResult(result);
			} else {
				setStatus("No QR code found in the uploaded image.");
			}
		} catch (error) {
			console.error("File scan error:", error);
			setStatus("Failed to scan QR code from image. Please try a clearer image.");
		}
	};

	if (!session || profile?.role !== "admin") {
		return (
			<MainLayout><div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4"><div className="w-full rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">Admin access required</h1><p className="mt-3 text-base-content/70">Event attendance monitoring is available to administrators only.</p><button className="btn btn-black mt-6 rounded-full" onClick={() => navigate("/")}>Back Home</button></div></div></MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
				<div className="mx-auto max-w-4xl">
					<div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-2xl backdrop-blur-xl">
						<div className="bg-slate-50 border-b border-slate-100 p-8 md:p-10 text-center sm:text-left">
							<p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
								QR Scanner
							</p>
							<h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
								Scan Event Code
							</h1>
							<p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 md:text-base">
								Scan a shared event QR code to open its event details and monitor attendance.
							</p>
						</div>

						<div className="p-0 bg-black relative">
							<div id="qr-reader" className="overflow-hidden" />
							<div className="bg-white px-5 py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100">
								{status}
							</div>
							{!isHttps && (
								<div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs px-3 py-2 rounded-full backdrop-blur-sm">
									<FiLock className="w-3 h-3 inline mr-1" /> Requires HTTPS
								</div>
							)}
							{cameraError && (
								<div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs px-3 py-2 rounded-full backdrop-blur-sm max-w-[90%] text-center">
									{cameraError}
								</div>
							)}
						</div>

						<div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col gap-3 justify-center">
							<button
								type="button"
								onClick={handleRetry}
								className="btn btn-primary btn-wide rounded-full flex items-center justify-center gap-2"
							>
								<FiRefreshCw className="w-4 h-4" />
								Retry Camera
							</button>
							<button
								type="button"
								onClick={() => setShowInstructions(!showInstructions)}
								className="btn btn-ghost btn-wide rounded-full flex items-center justify-center gap-2"
							>
								<FiCamera className="w-4 h-4" />
								Camera Help
							</button>
							<label className="btn btn-outline btn-wide rounded-full flex items-center justify-center gap-2 cursor-pointer">
								<FiUpload className="w-4 h-4" />
								Upload QR Image
								<input
									type="file"
									accept="image/*"
									onChange={handleFileUpload}
									className="hidden"
									id="qr-file-upload"
								/>
							</label>
						</div>

						{showInstructions && (
							<div className="bg-blue-50 border-t border-blue-100 p-6 text-left">
								<h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
									<FiCamera className="w-5 h-5" /> Camera Access Help
								</h3>
								<ul className="space-y-2 text-sm text-blue-700">
									<li className="flex items-center gap-2"><FiLock className="w-4 h-4" /> <strong>Allow camera access</strong> - Click the camera icon in your browser's address bar and select "Allow"</li>
									<li className="flex items-center gap-2"><FiLock className="w-4 h-4" /> Use <strong>HTTPS</strong> - Camera only works on HTTPS sites (or localhost)</li>
									<li className="flex items-center gap-2"><FiExternalLink className="w-4 h-4" /> If on mobile, use <strong>Chrome/Safari</strong> - other browsers may block camera</li>
									<li className="flex items-center gap-2"><FiRefreshCw className="w-4 h-4" /> Try the <strong>Retry Camera</strong> button after allowing permission</li>
									<li className="flex items-center gap-2"><FiUpload className="w-4 h-4" /> Or <strong>upload a QR code image</strong> if camera doesn't work</li>
								</ul>
							</div>
						)}

						<div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-center">
							<button
								type="button"
								onClick={() => navigate(-1)}
								className="btn btn-black btn-wide rounded-full"
							>
								Back to Events
							</button>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ScanQr;