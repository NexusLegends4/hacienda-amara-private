const readJsonBody = (request) => {
	if (request.body && typeof request.body === "object") return request.body;
	try {
		return JSON.parse(request.body || "{}");
	} catch {
		return {};
	}
};

export default async function handler(request, response) {
	if (request.method !== "POST") {
		response.setHeader("Allow", "POST");
		return response.status(405).json({ success: false, message: "Method not allowed." });
	}

	const { token, action } = readJsonBody(request);
	const secret = process.env.RECAPTCHA_SECRET_KEY;
	const expectedAction = typeof action === "string" ? action : "";

	if (!secret || !token || !expectedAction) {
		return response.status(400).json({ success: false, message: "Missing reCAPTCHA verification data." });
	}

	try {
		const params = new URLSearchParams({ secret, response: token });
		const googleResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params,
		});
		const result = await googleResponse.json();
		const score = Number(result.score || 0);
		const allowedHostnames = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || "hacienda-amara-private.vercel.app,localhost")
			.split(",")
			.map((hostname) => hostname.trim())
			.filter(Boolean);
		const validHostname = !result.hostname || allowedHostnames.includes(result.hostname);
		const valid = result.success === true && result.action === expectedAction && score >= 0.5 && validHostname;

		if (!valid) {
			return response.status(403).json({ success: false, message: "Security verification failed." });
		}

		return response.status(200).json({ success: true, score });
	} catch (error) {
		console.error("reCAPTCHA verification failed", error);
		return response.status(502).json({ success: false, message: "Security verification is temporarily unavailable." });
	}
}