import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const coreUmdPath = require.resolve("@ffmpeg/core");
const corePackagePath = dirname(dirname(dirname(coreUmdPath)));
const coreEsmPath = join(corePackagePath, "dist", "esm");
const outputPath = join(process.cwd(), "public", "ffmpeg");

mkdirSync(outputPath, { recursive: true });
copyFileSync(join(coreEsmPath, "ffmpeg-core.js"), join(outputPath, "ffmpeg-core.js"));
copyFileSync(join(coreEsmPath, "ffmpeg-core.wasm"), join(outputPath, "ffmpeg-core.wasm"));
writeFileSync(
	join(outputPath, "SOURCE.txt"),
	[
		"@ffmpeg/core 0.12.10 (GPL-2.0-or-later)",
		"Corresponding source: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/c3a763857c5e615ae8674715ad5e4f63ff469e9d",
		"",
	].join("\n"),
);
