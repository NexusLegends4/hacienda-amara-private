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

const drawModerationFrame = (source, width, height) => {
	const scale = Math.min(1, 512 / Math.max(width, height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width * scale));
	canvas.height = Math.max(1, Math.round(height * scale));
	const context = canvas.getContext("2d");
	if (!context) throw new Error("This browser could not prepare media for safety checking.");
	context.drawImage(source, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL("image/jpeg", 0.62);
};

export const createImageModerationPreview = (file) => new Promise((resolve, reject) => {
	if (typeof document === "undefined" || !file) {
		reject(new Error("This browser could not prepare the photo for safety checking."));
		return;
	}
	const objectUrl = URL.createObjectURL(file);
	const image = new Image();
	image.onload = () => {
		try {
			resolve(drawModerationFrame(image, image.naturalWidth, image.naturalHeight));
		} catch (error) {
			reject(error);
		} finally {
			URL.revokeObjectURL(objectUrl);
		}
	};
	image.onerror = () => {
		URL.revokeObjectURL(objectUrl);
		reject(new Error("The selected photo could not be read for safety checking."));
	};
	image.src = objectUrl;
});

export const createVideoModerationFrames = (file, frameCount = 5) => new Promise((resolve, reject) => {
	if (typeof document === "undefined" || !file) {
		reject(new Error("This browser could not prepare the video for safety checking."));
		return;
	}
	const objectUrl = URL.createObjectURL(file);
	const video = document.createElement("video");
	const timeoutId = window.setTimeout(() => finish(new Error("Video safety checking timed out. Try a shorter video.")), 20_000);
	let finished = false;
	const finish = (error, frames = []) => {
		if (finished) return;
		finished = true;
		window.clearTimeout(timeoutId);
		video.pause();
		video.removeAttribute("src");
		video.load();
		URL.revokeObjectURL(objectUrl);
		if (error) reject(error);
		else resolve(frames);
	};
	video.preload = "metadata";
	video.muted = true;
	video.playsInline = true;
	video.onerror = () => finish(new Error("The selected video could not be read for safety checking."));
	video.onloadedmetadata = async () => {
		if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth || !video.videoHeight) {
			finish(new Error("The selected video has no readable frames."));
			return;
		}
		try {
			const count = Math.max(1, Math.min(5, Math.floor(frameCount)));
			const sampleTimes = Array.from({ length: count }, (_, index) =>
				Math.min(video.duration - 0.01, Math.max(0, video.duration * ((index + 1) / (count + 1)))),
			);
			const frames = [];
			for (const time of sampleTimes) {
				await new Promise((seekResolve, seekReject) => {
					const seekTimeout = window.setTimeout(() => seekReject(new Error("Video safety checking timed out.")), 5_000);
					const onSeeked = () => {
						window.clearTimeout(seekTimeout);
						video.removeEventListener("seeked", onSeeked);
						seekResolve();
					};
					video.addEventListener("seeked", onSeeked, { once: true });
					video.currentTime = time;
				});
				frames.push(drawModerationFrame(video, video.videoWidth, video.videoHeight));
			}
			finish(null, frames);
		} catch (error) {
			finish(error);
		}
	};
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
