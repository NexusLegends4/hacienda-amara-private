import { Upload } from "tus-js-client";

const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

export const isResumableUploadNetworkError = (error) =>
	Boolean(error?.originalRequest && !error?.originalResponse);

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

const uploadChatMediaDirect = ({
	bucket,
	path,
	file,
	accessToken,
	supabaseUrl,
	anonKey,
	onProgress,
}) => new Promise((resolve, reject) => {
	const encodedPath = path.split("/").map(encodeURIComponent).join("/");
	const request = new XMLHttpRequest();
	request.open("POST", `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`);
	request.setRequestHeader("Authorization", "Bearer " + accessToken);
	request.setRequestHeader("apikey", anonKey);
	request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
	request.setRequestHeader("x-upsert", "false");
	request.upload.addEventListener("progress", (event) => {
		if (event.lengthComputable) onProgress?.(event.loaded, event.total);
	});
	request.addEventListener("load", () => {
		if (request.status >= 200 && request.status < 300) {
			resolve();
			return;
		}
		let payload;
		try { payload = JSON.parse(request.responseText); } catch { payload = null; }
		reject(new Error(payload?.message || payload?.error || `Media upload failed (${request.status}).`));
	});
	request.addEventListener("error", () => reject(new Error("Network error while uploading media. Check your connection and retry.")));
	request.addEventListener("abort", () => reject(new Error("Media upload was cancelled.")));
	request.send(file);
});

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

	let upload;
	upload = new Upload(file, {
		endpoint,
		retryDelays: [0, 3000, 5000, 10000, 20000],
		headers: {
			authorization: "Bearer " + accessToken,
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
		onError: (error) => {
			if (isResumableUploadNetworkError(error)) {
				void uploadChatMediaDirect({
					bucket,
					path,
					file,
					accessToken,
					supabaseUrl,
					anonKey,
					onProgress,
				}).then(resolve, reject);
				return;
			}

			const status = error?.originalResponse?.getStatus?.();
			const responseBody = error?.originalResponse?.getBody?.();
			reject(new Error(
				status
					? `Supabase rejected the media upload (${status}): ${responseBody || error.message}`
					: error.message,
			));
		},
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
