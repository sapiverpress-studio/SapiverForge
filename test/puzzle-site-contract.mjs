import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "puzzles.json"), "utf8"));
const requiredSlugs = [
  "kropki-sudoku",
  "hyper-sudoku",
  "anti-king-sudoku",
  "anti-knight-sudoku",
  "non-consecutive-sudoku",
  "odd-even-sudoku",
  "sudoku-x",
  "arrow-sudoku",
  "german-whispers-sudoku",
  "killer-sudoku",
  "little-killer-sudoku",
  "renban-sudoku",
  "sandwich-sudoku",
  "thermo-sudoku",
  "xv-sudoku",
  "trigoku"
];

function assert(condition, message) {
  if (!condition) throw new Error(`Sapiver Puzzles contract failed: ${message}`);
}
function read(relative) {
  const file = path.join(ROOT, relative);
  assert(fs.existsSync(file), `${relative} is missing`);
  return fs.readFileSync(file, "utf8");
}

assert(Array.isArray(config.puzzles), "config.puzzles must be an array");
assert(config.puzzles.length >= requiredSlugs.length, `expected at least ${requiredSlugs.length} puzzle games`);
const slugs = config.puzzles.map((item) => item.slug);
assert(new Set(slugs).size === slugs.length, "canonical puzzle slugs must be unique");
for (const slug of requiredSlugs) assert(slugs.includes(slug), `historic route ${slug} is not configured`);
for (const item of [...config.puzzles, ...(config.otherGames || [])]) {
  assert(/^https:\/\/[a-z0-9-]+\.netlify\.app\/$/i.test(item.source), `${item.slug} has an unexpected source URL`);
}

const hub = read("public/puzzles/index.html");
const player = read("public/play/game.html");
const redirects = read("public/_redirects");
const home = read("public/index.html");
for (const item of config.puzzles) {
  assert(hub.includes(`/play/${item.slug}/`), `puzzle hub is missing ${item.slug}`);
  assert(player.includes(item.source), `player routing is missing source for ${item.slug}`);
}
assert(player.includes("sapiver_export"), "player must preserve the historic export bridge");
assert(redirects.includes("/play/* /play/game.html 200"), "historic /play/* rewrite is missing");
assert(home.includes('href="/puzzles/"'), "homepage does not link to Sapiver Puzzles");
assert(home.includes("SAPI_PUZZLES_START"), "homepage puzzle block is missing");

const workflow = read(".github/workflows/release-daily-newsletter.yml");
assert(workflow.includes("node src/build-puzzles.mjs"), "daily publish workflow does not rebuild Sapiver Puzzles");
assert(workflow.includes("node test/puzzle-site-contract.mjs"), "daily publish workflow does not enforce the puzzle contract");

console.log(`Sapiver Puzzles contract passed: ${config.puzzles.length} puzzle games protected.`);
