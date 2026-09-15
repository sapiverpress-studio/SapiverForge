import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const audio = process.env.SHORT_AUDIO_PATH;
const output = process.env.SHORT_VIDEO_PATH;
const requestedCover = process.env.SHORT_COVER_PATH || "public/podcast/sapiver-forge-ai-briefing-cover-v1.png";

if (!audio || !output) throw new Error("SHORT_AUDIO_PATH and SHORT_VIDEO_PATH are required.");
if (!fs.existsSync(audio)) throw new Error(`Missing media input: ${audio}`);

// The approved native 16:9 Isla stills are the source artwork. The old 9:16
// PNG derivatives were malformed, so Short requests deliberately resolve to
// the matching approved native still instead of trying to repair bad assets.
let cover = requestedCover;
if (requestedCover.includes(`${path.sep}9x16${path.sep}`) || requestedCover.includes("/9x16/")) {
  const native = requestedCover.replace(/([\\/])9x16([\\/])/, "$116x9$2");
  if (fs.existsSync(native)) cover = native;
}
if (!fs.existsSync(cover)) throw new Error(`Missing approved Isla artwork: ${cover}`);

fs.mkdirSync(path.dirname(output), { recursive: true });

// Make a true 1080x1920 Short without altering Isla: the full approved still
// sits over a blurred fill made from the same still. No zoom, crop animation,
// synthetic artwork or repeated PNG repair path is involved.
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-loop", "1", "-framerate", "1", "-i", cover,
  "-i", audio,
  "-filter_complex",
  "[0:v]split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=10:1[bg2];[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg2];[bg2][fg2]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]",
  "-map", "[v]", "-map", "1:a",
  "-r", "30",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-tune", "stillimage",
  "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
  "-movflags", "+faststart", "-shortest", output
], { stdio: "inherit" });

if (result.status !== 0 || !fs.existsSync(output) || fs.statSync(output).size < 10000) {
  throw new Error("FFmpeg did not produce a valid vertical Short.");
}
console.log(`Generated vertical Daily Brief Short from ${cover}: ${output}`);
