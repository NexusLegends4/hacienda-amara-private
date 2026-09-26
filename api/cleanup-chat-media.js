import { createClient } from "@supabase/supabase-js";

const CHAT_MESSAGES_TABLE = "chat_messages";
const CHAT_MEDIA_BUCKET = "chat-media";
const MEDIA_CONTENT_PREFIX = "__HACIENDA_MEDIA__";
const TTL_HOURS = 24;
const BATCH_SIZE = 200;

const getSupabaseAdmin = () => {
	const supabaseUrl = process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error("Missing Supabase environment variables for cleanup.");
	}

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
};

const decodeMessageContent = (rawContent) => {
	if (typeof rawContent !== "string") {
		return { content: "", attachments: [] };
	}

	if (!rawContent.startsWith(MEDIA_CONTENT_PREFIX)) {
		return { content: rawContent, attachments: [] };
	}

	try {
		const parsed = JSON.parse(rawContent.slice(MEDIA_CONTENT_PREFIX.length));
		return {
			content: typeof parsed.content === "string" ? parsed.content : "",
			attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
		};
	} catch {
		return { content: rawContent.replace(MEDIA_CONTENT_PREFIX, ""), attachments: [] };
	}
};

const getAttachmentBucket = (attachment) => {
	const bucket = attachment.bucket;
	if (typeof bucket === "string" && bucket.trim()) return bucket;
	return CHAT_MEDIA_BUCKET;
};

const extractObjectPath = (attachment) => {
	if (typeof attachment.path === "string" && attachment.path.trim()) {
		return attachment.path.trim().replace(/^\/+/, "");
	}

	const source = [attachment.url, attachment.publicUrl, attachment.dataUrl]
		.find((value) => typeof value === "string" && value.startsWith("http"));

	if (typeof source !== "string") return "";

	try {
		const url = new URL(source);
		const bucket = getAttachmentBucket(attachment);
		const publicMarker = `/storage/v1/object/public/${bucket}/`;
		const signedMarker = `/storage/v1/object/sign/${bucket}/`;
		const pathname = url.pathname;

		if (pathname.includes(publicMarker)) {
			return decodeURIComponent(pathname.split(publicMarker)[1] || "").replace(/^\/+/, "");
		}

		if (pathname.includes(signedMarker)) {
			return decodeURIComponent(pathname.split(signedMarker)[1] || "").replace(/^\/+/, "");
		}
	} catch {
		return "";
	}

	return "";
};

const removeStorageObjects = async (supabaseAdmin, bucket, paths) => {
	const uniquePaths = [...new Set(paths)].filter(Boolean);
	let removed = 0;

	for (let index = 0; index < uniquePaths.length; index += 1000) {
		const batch = uniquePaths.slice(index, index + 1000);
		if (batch.length === 0) continue;

		const { error } = await supabaseAdmin.storage.from(bucket).remove(batch);
		if (error) {
			throw new Error(`Failed to remove storage files from ${bucket}: ${error.message}`);
		}

		removed += batch.length;
	}

	return removed;
};

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	let supabaseAdmin;
	try {
		supabaseAdmin = getSupabaseAdmin();
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}

	const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString();

	const { data: rows, error } = await supabaseAdmin
		.from(CHAT_MESSAGES_TABLE)
		.select("id, content, created_at")
		.lt("created_at", cutoff)
		.order("created_at", { ascending: true })
		.limit(BATCH_SIZE);

	if (error) {
		return res.status(500).json({ error: error.message });
	}

	const messages = rows || [];
	if (messages.length === 0) {
		return res.status(200).json({
			ok: true,
			deleted_messages: 0,
			removed_objects: 0,
			cutoff,
		});
	}

	const storagePathsByBucket = new Map();
	const messageIds = [];

	for (const row of messages) {
		messageIds.push(row.id);
		const decoded = decodeMessageContent(row.content);
		for (const attachment of decoded.attachments) {
			if (!attachment || typeof attachment !== "object") continue;
			const bucket = getAttachmentBucket(attachment);
			const path = extractObjectPath(attachment);
			if (!path) continue;

			if (!storagePathsByBucket.has(bucket)) {
				storagePathsByBucket.set(bucket, new Set());
			}
			storagePathsByBucket.get(bucket).add(path);
		}
	}

	let removedObjects = 0;
	try {
		for (const [bucket, paths] of storagePathsByBucket.entries()) {
			removedObjects += await removeStorageObjects(supabaseAdmin, bucket, [...paths]);
		}
	} catch (err) {
		return res.status(500).json({ error: err.message, removed_objects: removedObjects, cutoff });
	}

	const { error: deleteError } = await supabaseAdmin
		.from(CHAT_MESSAGES_TABLE)
		.delete()
		.in("id", messageIds);

	if (deleteError) {
		return res.status(500).json({
			error: deleteError.message,
			deleted_messages: 0,
			removed_objects: removedObjects,
			cutoff,
		});
	}

	return res.status(200).json({
		ok: true,
		deleted_messages: messageIds.length,
		removed_objects: removedObjects,
		cutoff,
	});
}
