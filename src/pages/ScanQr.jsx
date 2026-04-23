import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";

const ScanQr = () => {
	const navigate = useNavigate();
	const [status, setStatus] = useState("Starting camera...");

	useEffect(() => {
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

		const startScanner = async () => {
			try {
				await stopScanner();

				if (!isMounted) return;

				html5QrCode = new Html5Qrcode(scannerId);
				await html5QrCode.start(
					{ facingMode: "environment" },
					{
						fps: 10,
						qrbox: (viewfinderWidth, viewfinderHeight) => {
							const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
							return { width: size, height: size };
						},
					},
					handleResult,
				);
				if (isMounted) {
					setStatus("Camera ready. Scan a QR code.");
				}
			} catch (error) {
				console.error(error);
				setStatus(
					"Camera could not start. Allow camera access and use HTTPS or localhost.",
				);
			}
		};

		startScanner();

		return () => {
			isMounted = false;
			void stopScanner();
		};
	}, [navigate]);

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
								Point your camera at an event QR code to register instantly.
							</p>
						</div>

						<div className="p-0 bg-black">
							<div id="qr-reader" className="overflow-hidden" />
							<div className="bg-white px-5 py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100">
								{status}
							</div>
						</div>

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