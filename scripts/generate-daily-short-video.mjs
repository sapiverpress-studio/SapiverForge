import fs from "node:fs";
import { spawnSync } from "node:child_process";

const audio = process.env.SHORT_AUDIO_PATH;
const output = process.env.SHORT_VIDEO_PATH;
const requestedCover = process.env.SHORT_COVER_PATH || "public/podcast/sapiver-forge-ai-briefing-cover-v1.png";
if (!audio || !output) throw new Error("SHORT_AUDIO_PATH and SHORT_VIDEO_PATH are required.");
if (!fs.existsSync(audio)) throw new Error(`Missing media input: ${audio}`);
if (!fs.existsSync(requestedCover)) throw new Error(`Missing media input: ${requestedCover}`);

function imageDecodes(file) {
  const check = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-i", file,
    "-frames:v", "1",
    "-f", "null", "-"
  ], { encoding: "utf8" });
  return check.status === 0;
}

let cover = requestedCover;
if (!imageDecodes(cover)) {
  const fallback = cover.includes("/9x16/") ? cover.replace("/9x16/", "/16x9/") : "";
  if (fallback && fs.existsSync(fallback) && imageDecodes(fallback)) {
    console.warn(`Portrait Isla still is not FFmpeg-decodable; using matching approved 16:9 still: ${fallback}`);
    cover = fallback;
  } else {
    throw new Error(`Short artwork is not FFmpeg-decodable: ${requestedCover}`);
  }
}

fs.mkdirSync(new URL(".", `file://${output.startsWith("/") ? "" : process.cwd() + "/"}${output}`).pathname, { recursive: true });

// Decode one approved still, compose it into a 9:16 frame, then clone that
// decoded frame for the audio duration. For landscape fallbacks the complete
// Isla still is preserved over a blurred fill rather than being hard-cropped.
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", cover,
  "-i", audio,
  "-filter_complex",
  "[0:v]split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:1[bg2];[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg2];[bg2][fg2]overlay=(W-w)/2:(H-h)/2,fps=30,tpad=stop_mode=clone:stop_duration=3600,format=yuv420p[v]",
  "-map", "[v]", "-map", "1:a",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-tune", "stillimage",
  "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
  "-movflags", "+faststart", "-shortest", output
], { stdio: "inherit" });
if (result.status !== 0 || !fs.existsSync(output) || fs.statSync(output).size < 10000) {
  throw new Error("FFmpeg did not produce a valid vertical Short.");
}
console.log(`Generated vertical Daily Brief Short: ${output}`);
