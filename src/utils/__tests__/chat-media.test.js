import { describe, expect, it } from "vitest";
import { buildChatMediaPath, validateChatMedia } from "../chat-media";
import {
	getChatMediaResumableEndpoint,
	isResumableUploadNetworkError,
} from "../chat-media-upload";

describe("validateChatMedia", () => {
	it("accepts supported video formats and rejects unsupported formats", () => {
		expect(validateChatMedia({ type: "video/mp4", size: 1024 }, "video")).toBe("");
		expect(validateChatMedia({ type: "video/webm", size: 1024 }, "video")).toBe("");
		expect(validateChatMedia({ type: "video/quicktime", size: 1024 }, "video"))
			.toMatch(/MP4 or WebM/);
	});

	it("enforces different image and video size limits", () => {
		expect(validateChatMedia({ type: "video/mp4", size: 0 }, "video"))
			.toMatch(/empty or invalid/);
		expect(validateChatMedia({ type: "video/mp4", size: 50 * 1024 * 1024 }, "video"))
			.toBe("");
		expect(validateChatMedia({ type: "video/mp4", size: 51 * 1024 * 1024 }, "video"))
			.toMatch(/50 MB/);
		expect(validateChatMedia({ type: "image/jpeg", size: 11 * 1024 * 1024 }, "image"))
			.toMatch(/10 MB/);
		expect(validateChatMedia({ type: "image/png", size: 10 * 1024 * 1024 }, "image")).toBe("");
	});
});

describe("getChatMediaResumableEndpoint", () => {
	it("uses Supabase's direct storage host for project URLs", () => {
		expect(getChatMediaResumableEndpoint("https://project-ref.supabase.co"))
			.toBe("https://project-ref.storage.supabase.co/storage/v1/upload/resumable");
	});

	it("preserves custom storage origins while replacing any URL path", () => {
		expect(getChatMediaResumableEndpoint("https://storage.example.com/base"))
			.toBe("https://storage.example.com/storage/v1/upload/resumable");
	});
});

describe("isResumableUploadNetworkError", () => {
	it("identifies TUS failures that received no HTTP response", () => {
		expect(isResumableUploadNetworkError({
			originalRequest: {},
			originalResponse: null,
		})).toBe(true);
		expect(isResumableUploadNetworkError({
			originalRequest: {},
			originalResponse: { getStatus: () => 403 },
		})).toBe(false);
		expect(isResumableUploadNetworkError(new Error("Upload setup failed"))).toBe(false);
	});
});

describe("buildChatMediaPath", () => {
	it("nests uploaded objects under a sanitized conversation and message id", () => {
		expect(buildChatMediaPath("../conversation", "message-1", {
			id: "attachment-2",
			name: "Clip.MP4",
		})).toBe("conversations/conversation/message-1/attachment-2.mp4");
	});

	it("rejects missing path identity values", () => {
		expect(() => buildChatMediaPath("", "message-1", { id: "attachment-2" }))
			.toThrow(/safe path/);
	});
});
