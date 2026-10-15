export const CHAT_MEDIA_LIMITS = {
	imageBytes: 10 * 1024 * 1024,
	videoBytes: 50 * 1024 * 1024,
};

const SUPPORTED_MIME_TYPES = {
	image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
	video: new Set(["video/mp4", "video/webm", "video/quicktime"]),
};

export const validateChatMedia = (file, kind) => {
	if (!file || !SUPPORTED_MIME_TYPES[kind]?.has(file.type)) {
		return kind === "video"
			? "Choose an MP4, WebM, or MOV video file."
			: "Choose a JPEG, PNG, WebP, or GIF image.";
	}
	if (!Number.isFinite(file.size) || file.size <= 0) {
		return "The selected media file is empty or invalid.";
	}

	const limit = kind === "video"
		? CHAT_MEDIA_LIMITS.videoBytes
		: CHAT_MEDIA_LIMITS.imageBytes;
	if (file.size > limit) {
		const limitMb = limit / (1024 * 1024);
		return `${kind === "video" ? "Videos" : "Images"} must be ${limitMb} MB or smaller.`;
	}

	return "";
};

export const isValidVideoPoster = (poster) =>
	typeof poster === "string"
	&& poster.length <= 48_000
	&& /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(poster);

export const createVideoPoster = (file) => new Promise((resolve) => {
	if (typeof document === "undefined" || !file) {
		resolve("");
		return;
	}

	const objectUrl = URL.createObjectURL(file);
	const video = document.createElement("video");
	let settled = false;
	let timeoutId;
	const finish = (poster = "") => {
		if (settled) return;
		settled = true;
		window.clearTimeout(timeoutId);
		video.pause();
		video.removeAttribute("src");
		video.load();
		URL.revokeObjectURL(objectUrl);
		resolve(poster);
	};
	const capture = () => {
		if (settled || !video.videoWidth || !video.videoHeight) return;
		try {
			const scale = Math.min(1, 320 / video.videoWidth);
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
			canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
			const context = canvas.getContext("2d");
			if (!context) return finish();
			context.drawImage(video, 0, 0, canvas.width, canvas.height);
			finish(canvas.toDataURL("image/jpeg", 0.55));
		} catch {
			finish();
		}
	};

	video.preload = "metadata";
	video.muted = true;
	video.playsInline = true;
	video.addEventListener("loadedmetadata", () => {
		if (Number.isFinite(video.duration) && video.duration > 0.5) {
			try {
				video.currentTime = Math.min(0.5, video.duration / 2);
			} catch {
				// The first decoded frame will be used when seeking is unavailable.
			}
		}
	});
	video.addEventListener("loadeddata", capture);
	video.addEventListener("seeked", capture);
	video.addEventListener("error", () => finish());
	timeoutId = window.setTimeout(() => finish(), 8_000);
	video.src = objectUrl;
	video.load();
});

export const buildChatMediaPath = (conversationKey, messageId, attachment) => {
	const safeConversation = String(conversationKey || "").replace(/[^a-zA-Z0-9-]/g, "");
	const safeMessage = String(messageId || "").replace(/[^a-zA-Z0-9-]/g, "");
	const extension = String(attachment?.name || "")
		.split(".")
		.pop()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
	const attachmentId = String(attachment?.id || "")
		.replace(/[^a-zA-Z0-9-]/g, "");
	const suffix = extension ? `.${extension}` : "";

	if (!safeConversation || !safeMessage || !attachmentId) {
		throw new Error("Unable to create a safe path for the chat attachment.");
	}

	return `conversations/${safeConversation}/${safeMessage}/${attachmentId}${suffix}`;
};
