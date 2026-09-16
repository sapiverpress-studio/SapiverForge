import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const BASE = "https://suite.sapiverpress.co.uk";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(absolute));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(absolute);
  }
  return out;
}

function commonHead(title, description, pathname = "/") {
  const url = `${BASE}${pathname}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} | Sapiver Press</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Sapiver Press">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${BASE}/podcast/cover.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${BASE}/podcast/cover.png">
  <link rel="stylesheet" href="/styles.css">
  <link rel="alternate" type="application/rss+xml" title="Sapiver Forge Features" href="/features.xml">
  <link rel="alternate" type="application/rss+xml" title="Sapiver Forge AI Briefing Podcast" href="/podcast/feed.xml">
  <style>
    .trust-hero{max-width:900px}.trust-lead{font-size:clamp(1.25rem,3vw,1.8rem);font-weight:800;margin:.25rem 0 1rem;color:#24574c}.trust-grid,.social-grid,.wip-grid{display:grid;gap:1rem}.trust-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.social-grid{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))}.wip-grid{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}.trust-card,.social-card,.wip-card{border:1px solid rgba(36,87,76,.16);border-radius:18px;padding:1.15rem;background:rgba(255,255,255,.7)}.trust-card h3,.wip-card h3{margin:.1rem 0 .45rem}.trust-card p,.wip-card p{margin:.3rem 0 1rem}.social-card{display:flex;align-items:center;justify-content:center;min-height:64px;text-decoration:none;font-weight:800}.status{display:inline-block;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#24574c}.quiet-note{max-width:72ch}.site-header .brand{letter-spacing:-.02em}
    @media(max-width:640px){.trust-grid,.wip-grid{grid-template-columns:1fr}.social-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  </style>
</head>`;
}

function header() {
  return `<header class="site-header">
    <a class="brand" href="/">Sapiver Press</a>
    <p>Human-led. AI-empowered.</p>
    <nav aria-label="Site links">
      <a href="/">Home</a>
      <a href="/daily-brief/">Daily Brief</a>
      <a href="/podcast/">Podcast</a>
      <a href="/learn/">Sapiver Learn</a>
      <a href="/parents/">AI Inquisitive Parents</a>
      <a href="/puzzles/">Sapiver Puzzles</a>
      <a href="/resources/">Resources</a>
    </nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <p><strong>Sapiver Press</strong> · Human-led. AI-empowered.</p>
    <p>Useful publishing, learning, audio and practical experiments — shared clearly and released with human judgement.</p>
    <p><a href="/daily-brief/">Daily Brief</a> · <a href="/podcast/">Podcast</a> · <a href="/learn/">Sapiver Learn</a> · <a href="/parents/">AI Inquisitive Parents</a> · <a href="/puzzles/">Sapiver Puzzles</a> · <a href="/resources/">Resources</a></p>
  </footer>`;
}

const homepage = `${commonHead(
  "Sapiver Press",
  "Human-led, AI-empowered publishing, learning, audio, puzzles and practical experiments for curious people.",
  "/"
)}
<body>
${header()}
<main class="content">
  <section class="hero trust-hero">
    <p class="eyebrow">Sapiver Press</p>
    <h1>Useful things to read, listen to and try.</h1>
    <p class="trust-lead">Human-led. AI-empowered.</p>
    <p>Practical AI publishing, learning, audio and small experiments for people who are curious about what AI can actually do in ordinary life and work.</p>
    <p class="quiet-note">The focus here is useful work first. Things being built will be shared honestly as they develop, and products will only be introduced when they are ready and there is a clear reason for them to exist.</p>
    <div class="report-actions"><a class="button" href="/daily-brief/">Read the Daily Brief</a><a class="button button-secondary" href="/podcast/">Listen to the podcast</a></div>
  </section>

  <section class="posts">
    <p class="eyebrow">Explore</p>
    <h2>Start with what interests you.</h2>
    <div class="trust-grid">
      <article class="trust-card"><h3>Daily Brief</h3><p>Checked AI stories, practical context and a deeper daily story without the hype.</p><a class="text-link" href="/daily-brief/">Open the Daily Brief</a></article>
      <article class="trust-card"><h3>Sapiver Forge AI Briefing</h3><p>Short audio episodes for when reading is not convenient.</p><a class="text-link" href="/podcast/">Open the podcast</a></article>
      <article class="trust-card"><h3>Sapiver Learn</h3><p>Short daily lessons that build practical AI understanding from the foundations upward.</p><a class="text-link" href="/learn/">Open Sapiver Learn</a></article>
      <article class="trust-card"><h3>AI Inquisitive Parents</h3><p>Family-friendly projects and ideas that show what small, useful AI-assisted builds can look like.</p><a class="text-link" href="/parents/">Explore family projects</a></article>
      <article class="trust-card"><h3>Reports &amp; resources</h3><p>Longer guides, topic collections and checked learning material when you want more depth.</p><a class="text-link" href="/resources/">Browse resources</a></article>
      <article class="trust-card"><h3>Daily videos</h3><p>Short visual versions of the briefing, with a rolling archive kept on the site.</p><a class="text-link" href="/daily-brief/videos/">Watch recent videos</a></article>
    </div>
  </section>

  <!-- SAPI_PUZZLES_START --><section class="posts" id="sapiver-puzzles">
    <p class="eyebrow">Sapiver Puzzles</p>
    <h2>Daily Sudoku variants and browser games.</h2>
    <p>Play Kropki, Killer, Thermo, Sudoku X, Trigoku and more from one puzzle hub.</p>
    <p><a class="button" href="/puzzles/">Play Sapiver Puzzles</a></p>
  </section><!-- SAPI_PUZZLES_END -->

  <section class="posts">
    <p class="eyebrow">Work in progress</p>
    <h2>Some things are worth showing before they are worth selling.</h2>
    <p class="quiet-note">Two projects I care about most are still being developed. They are not being presented here as finished products or pushed through a sales funnel.</p>
    <div class="wip-grid">
      <article class="wip-card"><span class="status">In development</span><h3>Hen &amp; Bea’s Music House</h3><p>A story-led music-learning book and companion experience for children and grown-ups.</p></article>
      <article class="wip-card"><span class="status">In testing</span><h3>Drawing → DXF</h3><p>A practical manufacturing workflow for turning customer drawings into usable digital drawing and DXF packs.</p></article>
    </div>
  </section>

  <section class="posts">
    <p class="eyebrow">Follow Sapiver Press</p>
    <h2>Read, listen or follow wherever suits you.</h2>
    <div class="social-grid">
      <a class="social-card" href="https://www.instagram.com/sapiverpress/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
      <a class="social-card" href="https://www.tiktok.com/@sapiver.press" target="_blank" rel="noopener noreferrer">TikTok ↗</a>
      <a class="social-card" href="https://www.facebook.com/share/1JRpMzg9Uo/" target="_blank" rel="noopener noreferrer">Facebook ↗</a>
      <a class="social-card" href="https://www.pinterest.com/sapiver/" target="_blank" rel="noopener noreferrer">Pinterest ↗</a>
      <a class="social-card" href="https://x.com/SapiverPress" target="_blank" rel="noopener noreferrer">X ↗</a>
      <a class="social-card" href="https://www.threads.com/@sapiverpress" target="_blank" rel="noopener noreferrer">Threads ↗</a>
    </div>
  </section>

  <section class="posts">
    <p class="eyebrow">Stay in touch</p>
    <h2>Get the Sapiver Forge Daily Brief by email.</h2>
    <p>One concise weekday briefing with the stories, context and links worth keeping.</p>
    <p><a class="button" href="/newsletter/">Open the Daily Brief email page</a></p>
  </section>
</main>
${footer()}
</body>
</html>`;

const resources = `${commonHead(
  "Resources",
  "Browse Sapiver Press guides, reports, learning, family projects, puzzles and podcast resources.",
  "/resources/"
)}
<body>
${header()}
<main class="content">
  <section class="hero">
    <p class="eyebrow">Sapiver Press Resources</p>
    <h1>Useful things worth coming back to.</h1>
    <p>Guides, learning, reports, family projects, puzzles and audio collected in one place.</p>
  </section>
  <section class="posts">
    <div class="trust-grid">
      <article class="trust-card"><h3>Evergreen guides</h3><p>Practical guidance designed to remain useful after the daily headline has moved on.</p><a class="text-link" href="/guides/">Browse guides</a></article>
      <article class="trust-card"><h3>Topic library</h3><p>Browse AI adoption, automation, models, accountability and practical small-business use.</p><a class="text-link" href="/topics/">Browse topics</a></article>
      <article class="trust-card"><h3>Reports</h3><p>Longer checked learning briefs and focused research material.</p><a class="text-link" href="/reports/">Open reports</a></article>
      <article class="trust-card"><h3>Sapiver Learn</h3><p>Short daily lessons for building practical AI understanding.</p><a class="text-link" href="/learn/">Start learning</a></article>
      <article class="trust-card"><h3>AI Inquisitive Parents</h3><p>Real family projects and small app ideas for curious parents.</p><a class="text-link" href="/parents/">Explore projects</a></article>
      <article class="trust-card"><h3>Sapiver Puzzles</h3><p>Daily Sudoku variants and browser games.</p><a class="text-link" href="/puzzles/">Play puzzles</a></article>
      <article class="trust-card"><h3>Podcast</h3><p>Listen to the Sapiver Forge AI Briefing and recent episodes.</p><a class="text-link" href="/podcast/">Open podcast</a></article>
      <article class="trust-card"><h3>Video archive</h3><p>Recent Daily Brief videos in one rolling archive.</p><a class="text-link" href="/daily-brief/videos/">Watch videos</a></article>
    </div>
  </section>
</main>
${footer()}
</body>
</html>`;

// Rebrand the generated site chrome while keeping Sapiver Forge as the name of
// the Daily Brief / podcast content where it is genuinely the content brand.
for (const file of walk(PUBLIC)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = html
    .replace(/<title>([\s\S]*?) \| Sapiver Forge<\/title>/g, "<title>$1 | Sapiver Press</title>")
    .replaceAll('<meta property="og:site_name" content="Sapiver Forge">', '<meta property="og:site_name" content="Sapiver Press">')
    .replaceAll('<a class="brand" href="/">Sapiver Forge</a>', '<a class="brand" href="/">Sapiver Press</a>')
    .replaceAll('<a href="/">Sapiver Forge</a>', '<a href="/">Sapiver Press</a>')
    .replaceAll('Turning human input into clear, usable systems.', 'Useful publishing, learning, audio and practical experiments.')
    .replaceAll('Produced with AI assistance and released with human approval by Sapiver Forge.', 'Human-led. AI-empowered. Published by Sapiver Press.');
  if (html !== before) fs.writeFileSync(file, html, "utf8");
}

fs.writeFileSync(path.join(PUBLIC, "index.html"), homepage, "utf8");
fs.mkdirSync(path.join(PUBLIC, "resources"), { recursive: true });
fs.writeFileSync(path.join(PUBLIC, "resources", "index.html"), resources, "utf8");

const forbidden = [
  "Applied AI Gate System",
  "Opportunity Gate",
  "Workflow Control Gate",
  "Output Release Gate",
  "Outcome Review Gate",
  "AI Gate Workspace",
  "Gate Workspace",
  "Agent Connection Safety Gate",
  "Agent Connector Safety",
  "#gate-workspace",
  "/products/gate-system",
  "payhip.com/b/cmklU",
  "payhip.com/b/4rcSt",
  "payhip.com/b/qBPip",
  "payhip.com/b/pkSEY",
  "payhip.com/b/rgFXP"
];

const remaining = [];
for (const file of walk(PUBLIC)) {
  const html = fs.readFileSync(file, "utf8");
  for (const phrase of forbidden) {
    if (html.includes(phrase)) remaining.push(`${path.relative(ROOT, file)}: ${phrase}`);
  }
}
if (remaining.length) {
  throw new Error(`Gate product references remain in public HTML:\n${remaining.join("\n")}`);
}

const home = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
for (const required of [
  "Human-led. AI-empowered.",
  'href="/daily-brief/"',
  'href="/podcast/"',
  'href="/learn/"',
  'href="/parents/"',
  'href="/puzzles/"',
  "SAPI_PUZZLES_START",
  "instagram.com/sapiverpress",
  "tiktok.com/@sapiver.press",
  "x.com/SapiverPress",
  "threads.com/@sapiverpress"
]) {
  if (!home.includes(required)) throw new Error(`Trust-first homepage is missing required item: ${required}`);
}

console.log("Applied Sapiver Press trust-first website presentation; Gate sales references removed from public HTML.");
