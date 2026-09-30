import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATE = String(process.env.NEWS_INTELLIGENCE_DATE || "").trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) throw new Error("NEWS_INTELLIGENCE_DATE must use YYYY-MM-DD.");

const OUT = path.join(ROOT, "news-intelligence", DATE);
const BRIDGE = path.join(ROOT, "bridge", "news-intelligence", "latest");
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const firstSentence = (value) => clean(value).match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || clean(value);
const hashObject = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");

const manifestPath = path.join(OUT, "manifest.json");
const socialPath = path.join(OUT, "social.json");
const metadataPath = path.join(OUT, "newsletter-metadata.json");
if (!fs.existsSync(manifestPath) || !fs.existsSync(socialPath) || !fs.existsSync(metadataPath)) {
  throw new Error(`Missing generated Daily Brief files for ${DATE}.`);
}

const manifest = readJson(manifestPath);
const lead = manifest.stories?.[0];
if (!lead?.headline || !lead?.confirmed_fact) throw new Error("Daily Brief lead story is incomplete.");

let sentence = firstSentence(lead.confirmed_fact);
if (!/[.!?]$/.test(sentence)) sentence += ".";
const spokenScript = `${clean(lead.headline)}. ${sentence} Read the Sapiver Forge Daily Brief.`;

const social = readJson(socialPath);
social.spoken_script = spokenScript;
manifest.social = { ...manifest.social, spoken_script: spokenScript };
const { candidate_id: _oldCandidate, ...manifestCore } = manifest;
manifest.candidate_id = hashObject(manifestCore);

const metadata = readJson(metadataPath);
metadata.candidate_id = manifest.candidate_id;

writeJson(socialPath, social);
writeJson(manifestPath, manifest);
writeJson(metadataPath, metadata);

fs.mkdirSync(BRIDGE, { recursive: true });
for (const name of ["manifest.json", "social.json", "newsletter-metadata.json"]) {
  fs.copyFileSync(path.join(OUT, name), path.join(BRIDGE, name));
}

const hashNames = ["manifest.json", "daily-brief.md", "newsletter.html", "newsletter-metadata.json", "social.json", "sources.json", "human-review.html"];
const hashes = Object.fromEntries(hashNames.map((name) => {
  const file = path.join(BRIDGE, name);
  if (!fs.existsSync(file)) throw new Error(`Bridge file missing: ${name}`);
  return [name, sha256File(file)];
}));
writeJson(path.join(BRIDGE, "file-hashes.json"), hashes);

console.log(`Normalised Daily Brief Short for ${DATE}; candidate ${manifest.candidate_id}.`);
console.log(spokenScript);
