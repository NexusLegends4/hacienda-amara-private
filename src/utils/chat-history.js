import { supabase } from "./supabase";

const HISTORY_STORAGE_KEY = "hacienda-amara-chat-history-v1";
const CUSTOMER_CONVERSATION_KEY_STORAGE = "hacienda-amara-customer-conversation-key";
const ADMIN_AVAILABILITY_KEY = "hacienda-amara-admin-available-v1";
const CHAT_BUBBLE_STORAGE_KEY = "hacienda-amara-chat-bubble-state";
const MEDIA_CONTENT_PREFIX = "__HACIENDA_MEDIA__";
const CHAT_MEDIA_BUCKET = "chat-media";

const clearLocalChatData = () => {
	if (typeof window === "undefined") return;

	localStorage.removeItem(HISTORY_STORAGE_KEY);
	localStorage.removeItem(CUSTOMER_CONVERSATION_KEY_STORAGE);
	localStorage.removeItem(ADMIN_AVAILABILITY_KEY);
	localStorage.removeItem(CHAT_BUBBLE_STORAGE_KEY);
};

export const clearChatData = async (profile) => {
	try {
		if (profile?.role !== "client" || !profile.id) return;

		const { data: rows, error: readError } = await supabase
			.from("chat_messages")
			.select("content")
			.eq("conversation_key", profile.id);
		if (readError) throw readError;

		const paths = (rows || []).flatMap(({ content }) => {
			if (typeof content !== "string" || !content.startsWith(MEDIA_CONTENT_PREFIX)) return [];

			try {
				const payload = JSON.parse(content.slice(MEDIA_CONTENT_PREFIX.length));
				return Array.isArray(payload.attachments)
					? payload.attachments
						.filter((attachment) => attachment?.bucket === CHAT_MEDIA_BUCKET && attachment.path)
						.map((attachment) => attachment.path)
					: [];
			} catch {
				return [];
			}
		});

		if (paths.length > 0) {
			const { error: mediaError } = await supabase.storage
				.from(CHAT_MEDIA_BUCKET)
				.remove([...new Set(paths)]);
			if (mediaError) throw mediaError;
		}

		const { error: deleteError } = await supabase
			.from("chat_messages")
			.delete()
			.eq("conversation_key", profile.id);
		if (deleteError) throw deleteError;
	} finally {
		clearLocalChatData();
	}
};
