import { useEffect, useState } from "react";
import { FiDownload, FiWifiOff, FiX } from "react-icons/fi";

const isIosDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
	|| (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches
	|| navigator.standalone === true;

const PwaControls = () => {
	const [online, setOnline] = useState(() => navigator.onLine);
	const [installPrompt, setInstallPrompt] = useState(null);
	const [installed, setInstalled] = useState(isStandalone);
	const [installDismissed, setInstallDismissed] = useState(false);
	const [showIosInstructions, setShowIosInstructions] = useState(false);
	const iosDevice = isIosDevice();

	useEffect(() => {
		const handleOnline = () => setOnline(true);
		const handleOffline = () => setOnline(false);
		const handleInstallPrompt = (event) => {
			event.preventDefault();
			setInstallPrompt(event);
		};
		const handleInstalled = () => {
			setInstalled(true);
			setInstallPrompt(null);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		window.addEventListener("beforeinstallprompt", handleInstallPrompt);
		window.addEventListener("appinstalled", handleInstalled);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
			window.removeEventListener("appinstalled", handleInstalled);
		};
	}, []);

	const installApp = async () => {
		if (iosDevice) {
			setShowIosInstructions((current) => !current);
			return;
		}
		if (!installPrompt) return;

		await installPrompt.prompt();
		const choice = await installPrompt.userChoice;
		if (choice.outcome === "accepted") setInstalled(true);
		setInstallPrompt(null);
	};

	const canOfferInstall = !installed && (Boolean(installPrompt) || iosDevice);

	return (
		<>
			{!online && (
				<div
					role="status"
					className="fixed inset-x-0 top-0 z-[1100] flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow"
					style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
				>
					<FiWifiOff aria-hidden="true" />
					<span>You’re offline. Live bookings and account actions need an internet connection.</span>
				</div>
			)}
			{canOfferInstall && !installDismissed && (
				<div
					className="fixed bottom-4 left-4 z-[45] max-w-[calc(100vw-2rem)] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-xl"
					style={{ marginBottom: "env(safe-area-inset-bottom)" }}
				>
					<div className="flex items-start gap-3">
						<div className="min-w-0">
							<p className="text-sm font-semibold">Use Hacienda Amara like an app</p>
							{showIosInstructions && (
								<p className="mt-1 max-w-64 text-xs leading-5 text-base-content/70">
									Tap Share in Safari, then choose “Add to Home Screen.”
								</p>
							)}
						</div>
						<button
							type="button"
							className="btn btn-ghost btn-xs btn-circle shrink-0"
							onClick={() => setInstallDismissed(true)}
							aria-label="Dismiss install prompt"
						>
							<FiX aria-hidden="true" />
						</button>
					</div>
					<button type="button" onClick={installApp} className="btn btn-primary btn-sm mt-2 w-full">
						<FiDownload aria-hidden="true" />
						{iosDevice ? "How to install" : "Install app"}
					</button>
				</div>
			)}
		</>
	);
};

export default PwaControls;
