import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generateStructured } from "./gemini-provider.mjs";

const ROOT = process.cwd();
const DATE = String(process.env.PODCAST_DATE || process.env.NEWS_INTELLIGENCE_DATE || new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date())).trim();
const BASE = String(process.env.BLOG_BASE_URL || "https://suite.sapiverpress.co.uk").replace(/\/$/, "");
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) throw new Error("PODCAST_DATE must use YYYY-MM-DD.");

const sourcePath = path.join(ROOT, "news-intelligence", DATE, "manifest.json");
const OUT = path.join(ROOT, "reports", "daily-intelligence", DATE);
const slug = `${DATE}-daily-intelligence`;
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
fs.mkdirSync(OUT, { recursive: true });

const schema = {
  type: "object",
  properties: {
    episode_title: { type: "string" },
    episode_description: { type: "string" },
    opening: { type: "string" },
    sections: {
      type: "array", minItems: 4, maxItems: 6,
      items: {
        type: "object",
        properties: { heading: { type: "string" }, narration: { type: "string" } },
        required: ["heading", "narration"]
      }
    },
    closing: { type: "string" },
    estimated_duration_minutes: { type: "number" }
  },
  required: ["episode_title", "episode_description", "opening", "sections", "closing", "estimated_duration_minutes"]
};

function transcriptFor(podcast) {
  const transcript = [podcast.opening, ...podcast.sections.map((item) => item.narration), podcast.closing]
    .map(clean).filter(Boolean).join("\n\n");
  if (/https?:\/\//i.test(transcript)) throw new Error("Podcast narration contains a raw URL.");
  if (/\[[^\]]+\]/.test(transcript)) throw new Error("Podcast narration contains stage directions.");
  return transcript;
}

function assertCompleteShortScript(value) {
  const text = clean(value);
  if (!text) throw new Error("Daily Short script is empty.");
  const body = text.replace(/\s+Read the Sapiver Forge Daily Brief\.?$/i, "").trim();
  const lastSentence = body.split(/(?<=[.!?])\s+/).filter(Boolean).at(-1) || body;
  const finalWord = lastSentence.replace(/[.!?]+$/, "").trim().split(/\s+/).at(-1)?.toLowerCase() || "";
  const danglingWords = new Set([
    "a", "an", "additional", "and", "as", "at", "by", "for", "from", "if", "in", "into", "of", "on", "or",
    "over", "than", "that", "the", "to", "under", "when", "where", "which", "while", "with"
  ]);
  if (danglingWords.has(finalWord)) {
    throw new Error(`Daily Short script appears truncated: sentence ends with "${finalWord}".`);
  }
  if (!/[.!?]$/.test(lastSentence)) throw new Error("Daily Short script must contain a complete sentence before the call to action.");
  return text;
}

async function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing ${sourcePath}`);
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required for the detailed daily story.");
  const manifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (manifest.type !== "sapiver_forge_news_intelligence") throw new Error("Unexpected Daily Brief manifest type.");
  if (manifest.newsletter_ready_for_human_approval !== true) throw new Error("Daily Brief is not ready for human approval.");
  const story = manifest.stories?.[0];
  if (!story) throw new Error("Daily Brief has no lead story.");

  const podcast = await generateStructured({
    system: [
      "You write Sapiver Forge's daily detailed-story podcast for practical UK listeners.",
      "Use only the supplied verified Daily Brief material. Separate confirmed facts from Sapiver Forge interpretation.",
      "The podcast is strictly about the lead story. Never import facts, recommendations, examples or conclusions from another story in the Daily Brief.",
      "Treat vendor performance, cost, reliability and safety statements as vendor claims unless the supplied lead material says they were independently verified.",
      "Do not introduce named models, providers, partners, technical dependencies, availability conditions or capabilities that are absent from the supplied confirmed fact.",
      "If the source material does not establish a detail, state the uncertainty or omit it; never fill gaps from general knowledge.",
      "Explain the story naturally, avoid hype and advice, and never include raw URLs or stage directions in narration."
    ],
    prompt: `Create one focused daily podcast episode about the lead story below.\n\nTarget 4-7 minutes and 550-950 spoken words. Cover what happened, essential context, why it matters, what remains uncertain, one practical implication, and what to watch next. Use only the lead-story fields below. Do not turn this into a list of all today's stories. Do not advertise products.\n\nDATE: ${DATE}\nHEADLINE: ${story.headline}\nCONFIRMED FACT: ${story.confirmed_fact}\nWHY IT MATTERS: ${story.why_it_matters}\nSAPIver FORGE INTERPRETATION: ${story.interpretation}\nSOURCE: ${story.source}\nSOURCE TITLE: ${story.source_title || story.headline}\nPUBLISHED: ${story.published_at || "unknown"}\nCONFIDENCE: ${story.confidence}\nDerive the practical implication and what-to-watch section only from this lead story.`,
    schema
  });

  const transcript = transcriptFor(podcast);
  const words = transcript.split(/\s+/).filter(Boolean).length;
  if (words < 450 || words > 1150) throw new Error(`Daily detailed story length is outside limits: ${words} words.`);

  const shortScript = assertCompleteShortScript(manifest.social?.spoken_script || `${story.headline}. ${story.confirmed_fact} Read the Sapiver Forge Daily Brief.`);
  const metadata = {
    episode: {
      episode_title: clean(podcast.episode_title),
      episode_description: clean(podcast.episode_description),
      date: DATE,
      published_at: `${DATE}T07:00:00+01:00`,
      estimated_duration_minutes: Math.max(3, Math.min(8, Number(podcast.estimated_duration_minutes || words / 145))),
      selection_reason: "The lead verified story from today's Sapiver Forge Daily Brief.",
      related_article_url: `${BASE}/daily-brief/intelligence/${DATE}/`
    },
    date: DATE,
    slug,
    selected_story: {
      headline: story.headline,
      source: story.source,
      source_title: story.source_title || story.headline,
      source_url: story.url,
      confidence: story.confidence
    },
    short: {
      title: clean(story.headline),
      description: `${clean(story.why_it_matters)}\n\nRead today's Sapiver Forge Daily Brief: ${BASE}/daily-brief/`,
      script: shortScript
    },
    word_count: words,
    human_approval_required: true,
    approved_for_automatic_publication: false
  };
  const sourceNotes = `# Sources for ${metadata.episode.episode_title}\n\n- [${story.source}: ${story.source_title || story.headline}](${story.url})\n- Daily Brief date: ${DATE}\n- Confidence: ${story.confidence}\n`;
  const scriptMd = `# ${metadata.episode.episode_title}\n\n${metadata.episode.episode_description}\n\n${podcast.sections.map((section) => `## ${section.heading}\n\n${section.narration}`).join("\n\n")}\n`;

  fs.writeFileSync(path.join(OUT, "COPY_PASTE_INTO_ELEVENLABS.txt"), transcript + "\n");
  fs.writeFileSync(path.join(OUT, "short-script.txt"), shortScript + "\n");
  fs.writeFileSync(path.join(OUT, "podcast-script.md"), scriptMd);
  fs.writeFileSync(path.join(OUT, "episode-metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "source-notes.md"), sourceNotes);
  const sealed = ["COPY_PASTE_INTO_ELEVENLABS.txt", "short-script.txt", "podcast-script.md", "episode-metadata.json", "source-notes.md"];
  const hashes = Object.fromEntries(sealed.map((name) => [name, crypto.createHash("sha256").update(fs.readFileSync(path.join(OUT, name))).digest("hex")]));
  const candidateId = crypto.createHash("sha256").update(JSON.stringify({ metadata, hashes })).digest("hex");
  fs.writeFileSync(path.join(OUT, "candidate-manifest.json"), JSON.stringify({
    schema_version: 1,
    type: "sapiver_forge_daily_detailed_story",
    date: DATE,
    candidate_id: candidateId,
    human_approval_required: true,
    approved_for_automatic_publication: false,
    file_hashes: hashes
  }, null, 2) + "\n");
  console.log(`Generated daily detailed-story candidate ${candidateId}: ${words} words.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
