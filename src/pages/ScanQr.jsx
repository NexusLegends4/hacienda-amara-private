import { useContext, useEffect, useState, useRef } from "react";
import MainLayout from "../layouts/MainLayout";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext";
import { FiRefreshCw, FiCamera, FiLock, FiExternalLink } from "react-icons/fi";

const ScanQr = () => {
	const navigate = useNavigate();
	const { session, profile } = useContext(SessionContext);
	const [status, setStatus] = useState("Requesting camera permission...");
	const [showInstructions, setShowInstructions] = useState(false);
	const [isHttps, setIsHttps] = useState(false);
	const [cameraError, setCameraError] = useState(null);
	const isInitializedRef = useRef(false);

	useEffect(() => {
		// Check if we're on HTTPS or localhost
		const protocol = window.location.protocol;
		const hostname = window.location.hostname;
		const secure = protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
		setIsHttps(secure);
		
		if (!secure) {
			setStatus("Camera requires HTTPS. Please access via HTTPS or use localhost.");
		}
	}, []);

useEffect(() => {
		if (!session || profile?.role !== "admin") return undefined;
		
		// Prevent double initialization - use a more robust check
		if (isInitializedRef.current) {
			console.log("Scanner already initialized, skipping");
			return undefined;
		}
		isInitializedRef.current = true;
		
		let isMounted = true;
		let html5QrCode = null;
		const scannerId = "qr-reader";

		// Check if scanner already exists in DOM
		const existingContainer = document.getElementById(scannerId);
		if (existingContainer && existingContainer.children.length > 0) {
			console.log("Scanner already exists in DOM, skipping");
			isInitializedRef.current = false; // Allow re-init if needed
			return undefined;
		}

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
			} catch {
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
				console.error("Permission check error:", permError);
				if (facingMode === "environment") {
					// Try front camera as fallback
					console.log("Rear camera permission failed, trying front camera...");
					await startScanner("user");
					return;
				}
				if (!isMounted) return;
				const errorMsg = permError.name === "NotAllowedError" 
					? "Camera access blocked by browser. Click the camera icon 🔒 in the address bar → Allow → Refresh."
					: permError.name === "NotFoundError"
						? "No camera detected. Connect a webcam or check device settings."
						: `Camera error: ${permError.message}. Check browser permissions and try again.`;
				setCameraError(errorMsg);
				setStatus(errorMsg);
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
				console.error("Scanner start error:", error);
				if (!isMounted) return;
				if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
					if (facingMode === "environment") {
						// Try front camera as fallback
						await startScanner("user");
						return;
					}
					setCameraError("Camera access blocked. Click the camera icon 🔒 in the address bar → Allow → Refresh.");
					setStatus("Camera access blocked. Click the camera icon 🔒 in the address bar → Allow → Refresh.");
				} else if (error.name === "NotFoundError") {
					if (facingMode === "environment") {
						// Try front camera as fallback
						await startScanner("user");
						return;
					}
					setCameraError("No camera detected. Connect a webcam or check device settings.");
					setStatus("No camera detected. Connect a webcam or check device settings.");
				} else if (!isHttps) {
					setCameraError("Camera requires HTTPS. Please access via HTTPS or use localhost.");
					setStatus("Camera requires HTTPS. Please access via HTTPS or use localhost.");
				} else {
					if (facingMode === "environment") {
						// Try front camera as fallback
						await startScanner("user");
						return;
					}
					setCameraError(`Camera error: ${error.message}. Check permissions and try again.`);
					setStatus(`Camera error: ${error.message}. Check permissions and try again.`);
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
		isInitializedRef.current = false;
		setCameraError(null);
		setStatus("Retrying camera...");
	};

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