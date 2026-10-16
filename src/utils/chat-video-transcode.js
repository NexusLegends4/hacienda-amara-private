import { FFmpeg } from "@ffmpeg/ffmpeg";
import { CHAT_MEDIA_LIMITS } from "./chat-media";

const ffmpeg = new FFmpeg();
let ffmpegLoadPromise;
let conversionQueue = Promise.resolve();

const loadFFmpeg = () => {
	if (ffmpeg.loaded) return Promise.resolve();
	if (!ffmpegLoadPromise) {
		const assetsUrl = new URL(`${import.meta.env.BASE_URL}ffmpeg/`, window.location.origin);
		ffmpegLoadPromise = ffmpeg.load({
			coreURL: new URL("ffmpeg-core.js", assetsUrl).href,
			wasmURL: new URL("ffmpeg-core.wasm", assetsUrl).href,
		}).catch((error) => {
			ffmpegLoadPromise = undefined;
			throw error;
		});
	}
	return ffmpegLoadPromise;
};

const transcodeVideo = async (file, onProgress) => {
	await loadFFmpeg();
	const extension = file.name.split(".").pop()?.toLowerCase() === "webm" ? "webm" : "mp4";
	const inputName = `chat-input.${extension}`;
	const outputName = "chat-output.mp4";
	const reportProgress = ({ progress }) => {
		if (Number.isFinite(progress)) {
			onProgress?.(Math.min(1, Math.max(0, progress)));
		}
	};
	ffmpeg.on("progress", reportProgress);

	try {
		await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
		const exitCode = await ffmpeg.exec([
			"-i", inputName,
			"-map", "0:v:0",
			"-map", "0:a:0?",
			"-c:v", "libx264",
			"-preset", "veryfast",
			// Keep the source dimensions and use a visually high-quality encode.
			"-crf", "18",
			"-pix_fmt", "yuv420p",
			"-c:a", "aac",
			"-b:a", "192k",
			"-movflags", "+faststart",
			outputName,
		]);
		if (exitCode !== 0) {
			throw new Error("The video could not be converted. Try a different MP4 or WebM file.");
		}

		const output = await ffmpeg.readFile(outputName);
		if (!(output instanceof Uint8Array) || output.byteLength === 0) {
			throw new Error("Video conversion produced an empty file.");
		}
		if (output.byteLength > CHAT_MEDIA_LIMITS.videoBytes) {
			throw new Error("The prepared video exceeds this project's 50 MB upload limit. Choose a shorter video or reduce its size.");
		}

		const outputBaseName = file.name.replace(/\.[^.]+$/, "") || "video";
		return new File([output], `${outputBaseName}.mp4`, {
			type: "video/mp4",
			lastModified: Date.now(),
		});
	} finally {
		ffmpeg.off("progress", reportProgress);
		for (const name of [inputName, outputName]) {
			try {
				await ffmpeg.deleteFile(name);
			} catch (error) {
				console.warn(`Unable to clean up temporary video conversion file ${name}:`, error);
			}
		}
	}
};

export const transcodeChatVideo = (file, onProgress) => {
	const conversion = conversionQueue.then(() => transcodeVideo(file, onProgress));
	conversionQueue = conversion.catch(() => {});
	return conversion;
};
