const MAX_IMAGES_PER_REQUEST = 3;

export const moderateChatMediaFrames = async (frames, accessToken) => {
	if (!Array.isArray(frames) || frames.length === 0) {
		throw new Error("Media safety screening could not read this file. Choose another file and try again.");
	}
	if (!accessToken) {
		throw new Error("Secure chat sign-in is still connecting. Please wait a moment and try again.");
	}

	for (let index = 0; index < frames.length; index += MAX_IMAGES_PER_REQUEST) {
		const response = await fetch("/api/chat-media-moderation", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({ images: frames.slice(index, index + MAX_IMAGES_PER_REQUEST) }),
		});
		let result;
		try {
			result = await response.json();
		} catch {
			throw new Error("Media safety screening is unavailable. Please try again shortly.");
		}
		if (!response.ok || result?.allowed !== true) {
			throw new Error(result?.error || "This media may contain nudity or sexually explicit content and cannot be sent.");
		}
	}
	return true;
};
