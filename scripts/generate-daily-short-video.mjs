import fs from "node:fs";
import { spawnSync } from "node:child_process";

const audio = process.env.SHORT_AUDIO_PATH;
const output = process.env.SHORT_VIDEO_PATH;
const cover = process.env.SHORT_COVER_PATH || "public/podcast/sapiver-forge-ai-briefing-cover-v1.png";
if (!audio || !output) throw new Error("SHORT_AUDIO_PATH and SHORT_VIDEO_PATH are required.");
for (const file of [audio, cover]) if (!fs.existsSync(file)) throw new Error(`Missing media input: ${file}`);

fs.mkdirSync(new URL(".", `file://${output.startsWith("/") ? "" : process.cwd() + "/"}${output}`).pathname, { recursive: true });

// Keep the Daily Brief Short renderer deliberately simple and deterministic.
// Use the approved Isla still for the full audio duration instead of the
// zoompan animation that stalled in GitHub Actions.
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-loop", "1", "-framerate", "30", "-i", cover,
  "-i", audio,
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p",
  "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-tune", "stillimage",
  "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
  "-movflags", "+faststart", "-shortest", output
], { stdio: "inherit" });
if (result.status !== 0 || !fs.existsSync(output) || fs.statSync(output).size < 10000) {
  throw new Error("FFmpeg did not produce a valid vertical Short.");
}
console.log(`Generated vertical Daily Brief Short: ${output}`);
