// Lightweight chat notifications: a short tone and an optional desktop
// notification. No audio assets are needed, the tone is generated with the
// Web Audio API so it works offline and stays tiny.

let audioContext = null;

const getAudioContext = () => {
	if (typeof window === "undefined") return null;
	if (!audioContext) {
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtx) return null;
		audioContext = new AudioCtx();
	}
	if (audioContext.state === "suspended") {
		void audioContext.resume();
	}
	return audioContext;
};

// Plays a short two-note chime. `variant` shifts the pitch so an incoming
// message from a person sounds different from a system notification.
export const playChatTone = (variant = "incoming") => {
	const context = getAudioContext();
	if (!context) return;
	try {
		const now = context.currentTime;
		const notes = variant === "outgoing" ? [523.25, 659.25] : [659.25, 880.0];
		notes.forEach((frequency, index) => {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.type = "sine";
			oscillator.frequency.value = frequency;
			const start = now + index * 0.12;
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.start(start);
			oscillator.stop(start + 0.18);
		});
	} catch {
		// Audio is a nicety, never a failure.
	}
};

export const canShowDesktopNotifications = () =>
	typeof window !== "undefined" && "Notification" in window;

export const getNotificationPermission = () => {
	if (!canShowDesktopNotifications()) return "unsupported";
	return window.Notification.permission;
};

export const requestNotificationPermission = async () => {
	if (!canShowDesktopNotifications()) return "unsupported";
	if (window.Notification.permission === "granted") return "granted";
	if (window.Notification.permission === "denied") return "denied";
	try {
		return await window.Notification.requestPermission();
	} catch {
		return "denied";
	}
};

// Shows a desktop notification. Silently does nothing when the browser has
// not been granted permission.
export const showDesktopNotification = (title, body) => {
	if (!canShowDesktopNotifications()) return false;
	if (window.Notification.permission !== "granted") return false;
	try {
		const notification = new window.Notification(title, {
			body,
			icon: "/favicon.ico",
			tag: "hacienda-amara-chat",
			silent: true,
		});
		notification.onclick = () => {
			try {
				window.focus();
			} catch {
				// Some browsers block programmatic focus.
			}
			notification.close();
		};
		return true;
	} catch {
		return false;
	}
};

// Browsers only allow the permission prompt from a user gesture, so the
// request is made once, the first time the chat is used.
export const requestNotificationPermissionOnce = () => {
	if (typeof window === "undefined") return;
	if (!canShowDesktopNotifications()) return;
	if (window.Notification.permission !== "default") return;
	if (window.__haciendaNotificationPrompted) return;
	window.__haciendaNotificationPrompted = true;
	void requestNotificationPermission();
};
