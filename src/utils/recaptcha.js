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

	const { token, action, type } = readJsonBody(request);
	const isV2 = type === "v2";
	const secret = isV2 ? process.env.RECAPTCHA_V2_SECRET_KEY : process.env.RECAPTCHA_SECRET_KEY;
	const expectedAction = typeof action === "string" ? action : "";

	if (!secret || !token || (!isV2 && !expectedAction)) {
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

		// v2 has no score or action — success + valid hostname is enough.
		// v3 additionally requires a matching action name and a passing score.
		const valid = isV2
			? result.success === true && validHostname
			: result.success === true && result.action === expectedAction && score >= 0.5 && validHostname;

		if (!valid) {
			return response.status(403).json({ success: false, message: "Security verification failed." });
		}

		return response.status(200).json({ success: true, score: score || null });
	} catch (error) {
		console.error("reCAPTCHA verification failed", error);
		return response.status(502).json({ success: false, message: "Security verification is temporarily unavailable." });
	}
}
