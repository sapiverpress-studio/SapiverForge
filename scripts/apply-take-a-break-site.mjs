import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOME = path.join(ROOT, "public", "index.html");

if (!fs.existsSync(HOME)) throw new Error("Homepage was not built before Take a Break patch.");

let html = fs.readFileSync(HOME, "utf8");

// Keep the compact top navigation the user prefers, while leaving Sapiver Puzzles
// directly visible as its own destination as well.
if (!html.includes('href="#take-a-break"')) {
  const puzzleNav = '<a href="/puzzles/">Sapiver Puzzles</a>';
  if (html.includes(puzzleNav)) {
    html = html.replace(puzzleNav, `${puzzleNav}\n      <a href="#take-a-break">Take a Break</a>`);
  }
}

const start = "<!-- SAPI_PUZZLES_START -->";
const end = "<!-- SAPI_PUZZLES_END -->";
const match = html.match(new RegExp(`${start}[\\s\\S]*?${end}`));
if (!match) throw new Error("Sapiver Puzzles homepage block is missing; cannot build Take a Break area.");

if (!html.includes('id="take-a-break"')) {
  const zone = `<div class="take-break-zone" id="take-a-break">
  <section class="posts take-break-intro">
    <p class="eyebrow">Take a Break</p>
    <h2>Got ten minutes?</h2>
    <p>A place for puzzles, quick games and other small distractions when you want a few minutes away from the rest of the site.</p>
  </section>

  ${match[0]}

  <section class="posts take-break-more">
    <div class="trust-grid">
      <article class="trust-card">
        <h3>Sapiver Duel</h3>
        <p>A quick timeline-based duel game for a short break.</p>
        <a class="text-link" href="/play/duel/">Play Sapiver Duel</a>
      </article>
      <article class="trust-card">
        <h3>More when they earn their place</h3>
        <p>New small games and entertainment can live here as they are finished. No need to turn them into products or force a sales angle.</p>
      </article>
    </div>
  </section>
</div>`;
  html = html.replace(match[0], zone);
}

if (!html.includes(".take-break-zone")) {
  html = html.replace("</head>", `<style>
    .take-break-zone{scroll-margin-top:24px;margin:28px 0;padding:1px 0;border-radius:28px;background:linear-gradient(135deg,rgba(36,87,76,.08),rgba(185,155,94,.10))}
    .take-break-zone>.posts{margin:16px}
    .take-break-intro{border-left-color:#24574c}
    .take-break-intro h2{margin-bottom:.35rem}
    .take-break-more{border-left-color:#b99b5e}
    @media(max-width:640px){.take-break-zone>.posts{margin:10px}}
  </style>\n</head>`);
}

fs.writeFileSync(HOME, html, "utf8");

const finalHtml = fs.readFileSync(HOME, "utf8");
for (const required of [
  'id="take-a-break"',
  'href="#take-a-break"',
  'href="/puzzles/"',
  'href="/play/duel/"',
  "SAPI_PUZZLES_START",
  "Got ten minutes?"
]) {
  if (!finalHtml.includes(required)) throw new Error(`Take a Break homepage is missing required item: ${required}`);
}

console.log("Applied Sapiver Press Take a Break area with puzzles and Sapiver Duel.");
