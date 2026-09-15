import fs from "node:fs";
import { spawnSync } from "node:child_process";

const audio = process.env.SHORT_AUDIO_PATH;
const output = process.env.SHORT_VIDEO_PATH;
const cover = process.env.SHORT_COVER_PATH || "public/podcast/sapiver-forge-ai-briefing-cover-v1.png";
if (!audio || !output) throw new Error("SHORT_AUDIO_PATH and SHORT_VIDEO_PATH are required.");
for (const file of [audio, cover]) if (!fs.existsSync(file)) throw new Error(`Missing media input: ${file}`);

fs.mkdirSync(new URL(".", `file://${output.startsWith("/") ? "" : process.cwd() + "/"}${output}`).pathname, { recursive: true });

// Decode the approved still once, then clone that decoded frame for the audio
// duration. Repeatedly looping the PNG input caused FFmpeg parser-buffer
// failures on GitHub-hosted runners even after zoompan was removed.
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", cover,
  "-i", audio,
  "-filter_complex",
  "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,tpad=stop_mode=clone:stop_duration=3600,format=yuv420p[v]",
  "-map", "[v]", "-map", "1:a",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-tune", "stillimage",
  "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
  "-movflags", "+faststart", "-shortest", output
], { stdio: "inherit" });
if (result.status !== 0 || !fs.existsSync(output) || fs.statSync(output).size < 10000) {
  throw new Error("FFmpeg did not produce a valid vertical Short.");
}
console.log(`Generated vertical Daily Brief Short: ${output}`);
