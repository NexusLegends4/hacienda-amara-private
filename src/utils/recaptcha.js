const RECAPTCHA_SCRIPT_ID = "google-recaptcha-v3";

const loadRecaptcha = () => new Promise((resolve, reject) => {
	if (window.grecaptcha) {
		resolve(window.grecaptcha);
		return;
	}

	const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID);
	if (existingScript) {
		existingScript.addEventListener("load", () => resolve(window.grecaptcha), { once: true });
		existingScript.addEventListener("error", () => reject(new Error("Google reCAPTCHA could not load.")), { once: true });
		return;
	}

	const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
	if (!siteKey) {
		reject(new Error("reCAPTCHA is not configured. Add VITE_RECAPTCHA_SITE_KEY."));
		return;
	}

	const script = document.createElement("script");
	script.id = RECAPTCHA_SCRIPT_ID;
	script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}&trustedtypes=true`;
	script.async = true;
	script.defer = true;
	script.onload = () => resolve(window.grecaptcha);
	script.onerror = () => reject(new Error("Google reCAPTCHA could not load."));
	document.head.appendChild(script);
});

export const verifyRecaptcha = async (action) => {
	const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
	if (!siteKey) throw new Error("reCAPTCHA is not configured. Add VITE_RECAPTCHA_SITE_KEY.");

	const grecaptcha = await loadRecaptcha();
	const token = await new Promise((resolve, reject) => {
		grecaptcha.ready(() => {
			grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
		});
	});

	const response = await fetch("/api/verify-recaptcha", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token, action }),
	});
	const responseText = await response.text();
	let result;
	try {
		result = JSON.parse(responseText);
	} catch {
		throw new Error(response.status === 404
			? "The local verification API is unavailable. Use Vercel or vercel dev to test reCAPTCHA locally."
			: "Security verification service returned an invalid response.");
	}
	if (!response.ok || !result.success) {
		throw new Error(result.message || "Security verification failed. Please try again.");
	}

	return result;
};