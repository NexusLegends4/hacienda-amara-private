import { Upload } from "tus-js-client";

const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

export const getChatMediaResumableEndpoint = (supabaseUrl) => {
	const url = new URL(supabaseUrl);
	const projectSuffix = ".supabase.co";

	if (url.hostname.endsWith(projectSuffix)) {
		const projectRef = url.hostname.slice(0, -projectSuffix.length);
		url.hostname = `${projectRef}.storage.supabase.co`;
	}

	url.pathname = "/storage/v1/upload/resumable";
	url.search = "";
	url.hash = "";
	return url.toString().replace(/\/$/, "");
};

export const uploadChatMediaResumably = ({
	bucket,
	path,
	file,
	accessToken,
	supabaseUrl,
	anonKey,
	onProgress,
}) => new Promise((resolve, reject) => {
	if (!supabaseUrl || !anonKey || !accessToken) {
		reject(new Error("Secure chat sign-in is required to upload media."));
		return;
	}

	let endpoint;
	try {
		endpoint = getChatMediaResumableEndpoint(supabaseUrl);
	} catch (error) {
		reject(new Error(`Chat media upload URL is invalid: ${error.message}`));
		return;
	}

	const upload = new Upload(file, {
		endpoint,
		retryDelays: [0, 3000, 5000, 10000, 20000],
		headers: {
			authorization: `Bearer ${accessToken}`,
			apikey: anonKey,
			"x-upsert": "false",
		},
		uploadDataDuringCreation: true,
		removeFingerprintOnSuccess: true,
		chunkSize: TUS_CHUNK_BYTES,
		metadata: {
			bucketName: bucket,
			objectName: path,
			contentType: file.type || "application/octet-stream",
			cacheControl: "3600",
		},
		onError: reject,
		onProgress,
		onSuccess: resolve,
	});

	void upload.findPreviousUploads().then((previousUploads) => {
		if (previousUploads.length > 0) {
			upload.resumeFromPreviousUpload(previousUploads[0]);
		}
		upload.start();
	}).catch(reject);
});
