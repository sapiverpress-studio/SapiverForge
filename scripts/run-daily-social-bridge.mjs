import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const date = process.env.EDITION_DATE || '';
const candidate = process.env.CANDIDATE_ID || '';
if (process.env.CONFIRM !== 'SEND' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[a-f0-9]{64}$/.test(candidate)) throw Error('Invalid approved bridge request.');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const root = `news-intelligence/${date}`;
const manifest = read(`${root}/manifest.json`);
const release = read(`${root}/site-release.json`);
if (manifest.date !== date || manifest.candidate_id !== candidate || release.candidate_id !== candidate || manifest.newsletter_ready_for_human_approval !== true) throw Error('Requested candidate does not match the released edition.');
const daily = `reports/daily-intelligence/${date}`;
const contract = read(`${daily}/candidate-manifest.json`);
if (contract.date !== date || contract.type !== 'sapiver_forge_daily_detailed_story') throw Error('Invalid detailed story candidate.');
for (const [name, hash] of Object.entries(contract.file_hashes || {})) {
  if (path.basename(name) !== name) throw Error('Unsafe candidate filename.');
  if (crypto.createHash('sha256').update(fs.readFileSync(`${daily}/${name}`)).digest('hex') !== hash) throw Error(`Candidate hash mismatch: ${name}`);
}
const out = process.env.BRIDGE_RECEIPT_DIR;
if (!out || !path.isAbsolute(out)) throw Error('Absolute BRIDGE_RECEIPT_DIR is required.');
fs.mkdirSync(out, { recursive: true });
const identityPath = path.join(out, 'edition.json');
if (fs.existsSync(identityPath) && read(identityPath).candidate_id !== candidate) throw Error('Different candidate already handed off for this date; review existing posts first.');
fs.writeFileSync(identityPath, JSON.stringify({ date, candidate_id: candidate, source_sha: process.env.SOURCE_SHA }, null, 2));
const socialReceipt = path.join(out, 'social-distribution.json');
// Preserve successful posts from the original in-repository publisher during migration.
if (!fs.existsSync(socialReceipt) && fs.existsSync(`${daily}/social-distribution.json`)) fs.copyFileSync(`${daily}/social-distribution.json`, socialReceipt);
const social = spawnSync(process.execPath, ['scripts/post-daily-brief-social.mjs'], {
  env: { ...process.env, DAILY_BRIEF_MANIFEST: `${root}/manifest.json`, DISTRIBUTION_RECEIPT_PATH: socialReceipt }, encoding: 'utf8'
});
process.stdout.write(social.stdout || '');
process.stderr.write(social.stderr || '');
let failed = social.status !== 0;
const youtubePath = path.join(out, 'youtube-upload.json');
if (!fs.existsSync(youtubePath) && fs.existsSync(`${daily}/youtube-upload.json`)) fs.copyFileSync(`${daily}/youtube-upload.json`, youtubePath);
try {
  const previous = fs.existsSync(youtubePath) ? read(youtubePath) : {};
  if (previous.video_id || previous.id) {
    console.log('YouTube already posted; retaining existing receipt.');
  } else {
    if (previous.status === 'upload_started') throw Error('Previous YouTube upload has an uncertain result; check channel before retrying.');
    const meta = read(`${daily}/episode-metadata.json`);
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(meta.slug || '')) throw Error('Invalid episode slug.');
    const video = `public/podcast/episodes/${meta.slug}-short.mp4`;
    if (!fs.existsSync(video) || fs.statSync(video).size < 1000) throw Error('Released Short is missing; finish the media release before retrying.');
    for (const name of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) if (!process.env[name]) throw Error(`Missing ${name}`);
    if (!meta.short?.title || !meta.short?.description) throw Error('Short metadata is missing.');
    fs.writeFileSync(youtubePath, JSON.stringify({ status: 'upload_started', date, candidate_id: candidate }));
    const result = spawnSync(process.execPath, ['src/upload-youtube-short.mjs'], {
      env: { ...process.env, VIDEO_PATH: video, TITLE: meta.short.title, DESCRIPTION: meta.short.description, PRIVACY_STATUS: 'public' }, encoding: 'utf8'
    });
    if (result.status !== 0) throw Error('YouTube upload failed; check the channel before clearing the pending receipt and retrying.');
    const receipt = JSON.parse(result.stdout.trim());
    if (!receipt.video_id) throw Error('YouTube returned no video ID.');
    fs.writeFileSync(youtubePath, JSON.stringify({ ...receipt, date, candidate_id: candidate }, null, 2));
    console.log(`YouTube Short: https://www.youtube.com/watch?v=${receipt.video_id}`);
  }
} catch (error) {
  failed = true;
  console.error(error.message);
  fs.writeFileSync(path.join(out, 'youtube-error.json'), JSON.stringify({ error: error.message, date }, null, 2));
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const receipt = fs.existsSync(socialReceipt) ? read(socialReceipt) : {};
  const yt = fs.existsSync(youtubePath) ? read(youtubePath) : {};
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nEdition ${date}\n\nFacebook: ${receipt.facebook?.id || 'FAILED'}\n\nPinterest: ${receipt.pinterest?.id || 'FAILED'}\n\nYouTube: ${yt.video_id || yt.id || 'FAILED'}\n`);
}
if (failed) process.exitCode = 1;
