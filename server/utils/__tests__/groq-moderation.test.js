import { describe, expect, it, vi } from "vitest";
import { classifyChatMessage, validateModerationResult } from "../groq-moderation";

describe("validateModerationResult", () => {
	it("accepts only a complete, consistent allow result", () => {
		expect(validateModerationResult({
			allowed: true,
			category: "allowed",
			reason: "resort_question",
			user_message: "",
		})).toMatchObject({ allowed: true, category: "allowed" });
	});

	it.each([
		null,
		{ allowed: "yes", category: "allowed", reason: "", user_message: "" },
		{ allowed: true, category: "off_topic", reason: "", user_message: "" },
		{ allowed: false, category: "made_up", reason: "", user_message: "" },
		{ allowed: false, category: "allowed", reason: "", user_message: "" },
		{ allowed: false, category: "off_topic", reason: "x".repeat(161), user_message: "no" },
	])("rejects invalid classification: %j", (result) => {
		expect(validateModerationResult(result)).toBeNull();
	});
});

describe("classifyChatMessage", () => {
	it("fails closed if moderation is not configured", async () => {
		const fetchImpl = vi.fn();
		const result = await classifyChatMessage({ text: "Hi", role: "client", fetchImpl });
		expect(result.allowed).toBe(false);
		expect(result.unavailable).toBe(true);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("fails closed on malformed Groq JSON", async () => {
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "{not json}" } }] }),
		});
		const result = await classifyChatMessage({ text: "Hi", role: "client", apiKey: "test", fetchImpl });
		expect(result.allowed).toBe(false);
		expect(result.unavailable).toBe(true);
	});

	it("validates structured allowed and blocked results", async () => {
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ choices: [{ message: { content: JSON.stringify({
				allowed: false,
				category: "off_topic",
				reason: "unrelated_topic",
				user_message: "Please keep chat related to the resort.",
			}) } }] }),
		});
		const result = await classifyChatMessage({ text: "Tell me about politics", role: "client", apiKey: "test", fetchImpl });
		expect(result).toMatchObject({ allowed: false, category: "off_topic" });
		const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
		expect(requestBody.model).toBe("openai/gpt-oss-20b");
		expect(requestBody.response_format).toEqual({ type: "json_object" });
	});
});
