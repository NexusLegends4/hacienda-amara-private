export const CHAT_MEDIA_LIMITS = {
	imageBytes: 10 * 1024 * 1024,
	videoBytes: 50 * 1024 * 1024,
};

const SUPPORTED_MIME_TYPES = {
	image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
	video: new Set(["video/mp4", "video/webm"]),
};

export const validateChatMedia = (file, kind) => {
	if (!file || !SUPPORTED_MIME_TYPES[kind]?.has(file.type)) {
		return kind === "video"
			? "Choose an MP4 or WebM video file."
			: "Choose a JPEG, PNG, WebP, or GIF image.";
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
