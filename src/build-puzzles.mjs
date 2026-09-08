import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const CONFIG_PATH = path.join(ROOT, "config", "puzzles.json");
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const allGames = [...config.puzzles, ...(config.otherGames || [])];

const BRAND = {
  ink: "#17332d",
  inkDeep: "#102620",
  muted: "#66716b",
  paper: "#f4efe4",
  paperSoft: "#fbf8f1",
  accent: "#24574c",
  accentDeep: "#163f37",
  gold: "#b99b5e",
  rail: "#122a25",
  railSoft: "#1b3b34"
};

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(file, content) { ensureDir(path.dirname(file)); fs.writeFileSync(file, content, "utf8"); }
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shellStyles() {
  return `
    :root{--ink:${BRAND.ink};--ink-deep:${BRAND.inkDeep};--muted:${BRAND.muted};--paper:${BRAND.paper};--paper-soft:${BRAND.paperSoft};--accent:${BRAND.accent};--accent-deep:${BRAND.accentDeep};--gold:${BRAND.gold};--rail:${BRAND.rail};--rail-soft:${BRAND.railSoft}}
    *{box-sizing:border-box}html{color-scheme:light}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:radial-gradient(circle at 92% 4%,rgba(185,155,94,.15),transparent 24rem),linear-gradient(135deg,var(--rail) 0 13rem,#dfe7dc 13rem,var(--paper) 36rem,var(--paper-soft) 100%);background-attachment:fixed;min-height:100vh;line-height:1.58}
    a{color:inherit}.site-header{width:min(1180px,calc(100% - 28px));margin:14px auto 0;padding:20px 24px;border:1px solid rgba(255,255,255,.11);border-radius:24px;background:linear-gradient(135deg,rgba(18,42,37,.99),rgba(27,59,52,.97));color:#fffaf0;box-shadow:0 22px 60px rgba(9,29,24,.2);display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}.brand{font-size:clamp(1.45rem,3vw,2rem);font-weight:850;letter-spacing:-.04em;text-decoration:none}.brand small{display:block;font-size:.76rem;font-weight:650;letter-spacing:.02em;color:#d8e2dc;margin-top:2px}.site-header nav{display:flex;gap:8px;flex-wrap:wrap}.site-header nav a,.pill-button{display:inline-flex;align-items:center;min-height:40px;padding:9px 14px;border-radius:999px;text-decoration:none;font-weight:750}.site-header nav a{border:1px solid rgba(255,250,240,.22);background:rgba(255,255,255,.06)}.site-header nav a:hover,.site-header nav a:focus-visible{background:rgba(255,255,255,.13);border-color:rgba(255,250,240,.4)}
    main{width:min(1080px,calc(100% - 28px));margin:0 auto;padding:26px 0 48px}.hero,.panel{background:rgba(255,253,248,.96);border:1px solid rgba(185,155,94,.3);border-radius:24px;box-shadow:0 10px 30px rgba(20,49,42,.09);backdrop-filter:blur(8px)}.hero{padding:clamp(24px,5vw,44px);position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:260px;height:260px;right:-90px;top:-100px;border-radius:50%;background:radial-gradient(circle,rgba(185,155,94,.32),rgba(36,87,76,.04) 62%,transparent 70%);pointer-events:none}.eyebrow{margin:0 0 8px;text-transform:uppercase;letter-spacing:.16em;font-size:.76rem;font-weight:850;color:var(--accent)}h1{font-size:clamp(2rem,6vw,4rem);line-height:1.02;letter-spacing:-.055em;margin:.1em 0 .25em;max-width:14ch}h2{letter-spacing:-.035em}.lead{max-width:70ch;color:var(--muted);font-size:1.05rem}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.pill-button{background:var(--accent);color:#fffaf0;border:1px solid var(--accent);cursor:pointer}.pill-button.secondary{background:transparent;color:var(--accent);border-color:rgba(36,87,76,.35)}
    .section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:30px 2px 14px}.section-head h2{margin:0}.section-head p{margin:0;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{background:rgba(255,253,248,.96);border:1px solid rgba(185,155,94,.34);border-radius:20px;padding:20px;box-shadow:0 8px 26px rgba(20,49,42,.07);display:flex;flex-direction:column;min-height:190px}.card:before{content:"";display:block;width:44px;height:5px;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--gold));margin-bottom:16px}.card h3{margin:0 0 7px;font-size:1.16rem}.card p{margin:0 0 18px;color:var(--muted);font-size:.93rem}.card a{margin-top:auto;width:fit-content}.notice{margin-top:20px;padding:16px 18px;border-left:4px solid var(--gold);background:rgba(255,253,248,.88);border-radius:14px;color:var(--muted)}footer{width:min(1080px,calc(100% - 28px));margin:0 auto 26px;color:#dbe4df;background:rgba(18,42,37,.96);border-radius:20px;padding:18px 22px;font-size:.9rem}footer a{color:#fffaf0}
    @media(max-width:820px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.site-header{padding:18px}.site-header nav{width:100%}.site-header nav a{flex:1;justify-content:center}.grid{grid-template-columns:1fr}.section-head{align-items:start;flex-direction:column}.hero{padding:24px 20px}h1{max-width:100%}}
  `;
}

function header() {
  return `<header class="site-header"><a class="brand" href="/">Sapiver Press<small>Practical tools, publishing and learning</small></a><nav aria-label="Site links"><a href="/">Home</a><a href="/puzzles/" aria-current="page">Sapiver Puzzles</a><a href="/learn/">Sapiver Learn</a><a href="/parents/">AI Inquisitive Parents</a><a href="/daily-brief/">Daily Brief</a></nav></header>`;
}

function hubPage() {
  const puzzleCards = config.puzzles.map((item) => `<article class="card"><h3>${esc(item.name)}</h3><p>Daily browser puzzle. The original working puzzle engine is retained behind the Sapiver-branded play page.</p><a class="pill-button" href="/play/${esc(item.slug)}/">Play ${esc(item.name)}</a></article>`).join("\n");
  const gameCards = (config.otherGames || []).map((item) => `<article class="card"><h3>${esc(item.name)}</h3><p>${esc(item.description || "Sapiver browser game.")}</p><a class="pill-button" href="/play/${esc(item.slug)}/">Play ${esc(item.name)}</a></article>`).join("\n");
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sapiver Puzzles | Daily Sudoku variants and browser games</title><meta name="description" content="Play Sapiver Puzzles: daily Sudoku variants, Trigoku and Sapiver browser games."><link rel="canonical" href="https://suite.sapiverpress.co.uk/puzzles/"><meta name="theme-color" content="${BRAND.rail}"><style>${shellStyles()}</style></head><body>${header()}<main><section class="hero"><p class="eyebrow">Sapiver Puzzles</p><h1>One place for the puzzles.</h1><p class="lead">The restored Sapiver Press browser puzzle collection: daily Sudoku variants, Trigoku and other games. Historic play links are retained and the games are presented in the current Sapiver green, cream and gold palette.</p><div class="actions"><a class="pill-button" href="#sudoku">Browse Sudoku variants</a>${gameCards ? '<a class="pill-button secondary" href="#games">Other games</a>' : ""}</div></section><div class="section-head" id="sudoku"><div><p class="eyebrow">Daily play</p><h2>Sudoku variants & Trigoku</h2></div><p>${config.puzzles.length} playable games</p></div><section class="grid" aria-label="Sudoku variants">${puzzleCards}</section>${gameCards ? `<div class="section-head" id="games"><div><p class="eyebrow">More Sapiver games</p><h2>Other browser games</h2></div></div><section class="grid" aria-label="Other games">${gameCards}</section>` : ""}<aside class="notice"><strong>Protected by the build.</strong> The catalogue, historic routes and branding layer are regenerated from source-controlled configuration on every suite publish. A contract check stops deployment if the puzzle section disappears.</aside></main><footer>Sapiver Puzzles is part of <a href="/">Sapiver Press</a>. The individual puzzle engines also remain independently hosted on Netlify as a second copy of the working game layer.</footer></body></html>`;
}

function gameThemeCss() {
  return `
    :root{
      --bg1:#f4efe4 !important;--bg2:#fbf8f1 !important;--panel:#fffdf8 !important;--panel2:#fbf8f1 !important;
      --stroke:rgba(36,87,76,.16) !important;--stroke2:rgba(36,87,76,.28) !important;--text:#17332d !important;--muted:#66716b !important;
      --violet:#24574c !important;--green:#24574c !important;--amber:#b99b5e !important;--rose:#a65353 !important;--blue:#24574c !important;--arrow:#b99b5e !important;
      --cellBg:#fffdf8 !important;--cellAlt:#fbf8f1 !important;--cellGiven:#e7ede8 !important;--cellSelect:rgba(36,87,76,.22) !important;--cellPeer:rgba(36,87,76,.07) !important;--cellMatch:rgba(185,155,94,.18) !important;--hintBg:rgba(36,87,76,.15) !important;
      --shadow:0 18px 45px rgba(20,49,42,.12) !important;
    }
    body{background:radial-gradient(900px 600px at 90% 0%,rgba(185,155,94,.14),transparent 55%),linear-gradient(180deg,#f4efe4,#fbf8f1) !important;color:#17332d !important}
    .app,.panel{border-color:rgba(185,155,94,.32) !important}.app{background:linear-gradient(180deg,rgba(255,253,248,.96),rgba(251,248,241,.94)) !important}
    .btn.primary,.btn.good{color:#163f37 !important}.pill,.key,.btn,.status,.stat{border-color:rgba(36,87,76,.18) !important}
  `;
}

function playPage() {
  const lookup = {};
  for (const item of allGames) {
    lookup[item.slug] = item;
    for (const alias of item.aliases || []) lookup[alias] = item;
  }
  const lookupJson = JSON.stringify(lookup).replaceAll("<", "\\u003c");
  const themeJson = JSON.stringify(gameThemeCss()).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Sapiver Puzzles | Play</title><meta name="theme-color" content="${BRAND.rail}"><style>${shellStyles()}body{overflow:hidden}.play-wrap{height:100dvh;display:grid;grid-template-rows:auto 1fr}.site-header{width:calc(100% - 16px);margin:8px auto 0;padding:10px 14px;border-radius:17px}.site-header .brand{font-size:1.05rem}.site-header .brand small{display:none}.site-header nav a{min-height:34px;padding:6px 10px;font-size:.83rem}.game-stage{width:calc(100% - 16px);height:calc(100% - 8px);margin:8px auto 0;padding:0;background:#fff;border:1px solid rgba(185,155,94,.38);border-radius:18px 18px 0 0;overflow:hidden;box-shadow:0 8px 26px rgba(20,49,42,.11);position:relative}.game-stage iframe{width:100%;height:100%;border:0;display:block;background:#fff;position:relative;z-index:1}.loading{position:absolute;inset:0;display:grid;place-items:center;background:var(--paper-soft);color:var(--muted);z-index:0}@media(max-width:680px){.site-header nav a:not([aria-current]){display:none}.site-header{flex-wrap:nowrap}.game-stage{border-radius:14px 14px 0 0}}</style></head><body><div class="play-wrap">${header()}<main class="game-stage" id="stage"><div class="loading" id="loading">Loading Sapiver puzzle…</div></main></div><script>(()=>{const lookup=${lookupJson};const theme=${themeJson};const parts=location.pathname.split('/').filter(Boolean);const slug=decodeURIComponent(parts[parts.length-1]||'');const item=lookup[slug];if(!item){location.replace('/puzzles/');return}const target=new URL('/puzzle-source/'+encodeURIComponent(item.slug)+'/',location.origin);for(const [key,value] of new URLSearchParams(location.search))target.searchParams.append(key,value);if(new URLSearchParams(location.search).has('sapiver_export')){location.replace(target.href);return}document.title=item.name+' | Sapiver Puzzles';const stage=document.getElementById('stage');const frame=document.createElement('iframe');frame.src=target.pathname+target.search;frame.title=item.name;frame.allow='clipboard-write; fullscreen';frame.referrerPolicy='same-origin';frame.addEventListener('load',()=>{document.getElementById('loading')?.remove();try{const doc=frame.contentDocument;if(!doc?.head)return;let style=doc.getElementById('sapiver-corporate-theme');if(!style){style=doc.createElement('style');style.id='sapiver-corporate-theme';doc.head.append(style)}style.textContent=theme}catch(error){console.warn('Sapiver puzzle theme could not be applied',error)}});stage.append(frame)})();</script></body></html>`;
}

function redirects() {
  const lines = ["/play /puzzles/ 301!", "/play/ /puzzles/ 301!"];
  for (const item of allGames) lines.push(`/puzzle-source/${item.slug}/* ${item.source}:splat 200`);
  for (const item of allGames) {
    for (const alias of item.aliases || []) {
      if (alias === item.slug) continue;
      lines.push(`/play/${alias} /play/${item.slug}/ 301!`);
      lines.push(`/play/${alias}/ /play/${item.slug}/ 301!`);
    }
  }
  lines.push("/play/* /play/game.html 200");
  return `${lines.join("\n")}\n`;
}

function patchSiteNavigation() {
  const pending = [PUBLIC];
  const htmlFiles = [];
  while (pending.length) {
    const dir = pending.pop();
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["puzzles", "play", "products"].includes(entry.name)) continue;
        pending.push(full);
      } else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
    }
  }
  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, "utf8");
    if (!html.includes('class="site-header"') || html.includes('href="/puzzles/"')) continue;
    for (const anchor of ['<a href="/resources/">Resources</a>','<a href="/learn/">Sapiver Learn</a>','<a href="/daily-brief/">Daily Brief</a>']) {
      if (!html.includes(anchor)) continue;
      html = html.replace(anchor, `<a href="/puzzles/">Sapiver Puzzles</a>${anchor}`);
      fs.writeFileSync(file, html, "utf8");
      break;
    }
  }
}

function patchHomepage() {
  const file = path.join(PUBLIC, "index.html");
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  const start = "<!-- SAPI_PUZZLES_START -->";
  const end = "<!-- SAPI_PUZZLES_END -->";
  const block = `${start}<section class="posts" id="sapiver-puzzles"><p class="eyebrow">Sapiver Puzzles</p><h2>Daily Sudoku variants and browser games are back in the suite.</h2><p>Play the restored Sapiver puzzle collection from one permanent section, with the historic game routes and current Sapiver corporate branding preserved by the build.</p><p><a class="button" href="/puzzles/">Play Sapiver Puzzles</a></p></section>${end}`;
  const existing = new RegExp(`${start}[\\s\\S]*?${end}`, "g");
  if (existing.test(html)) html = html.replace(existing, block);
  else if (html.includes("</main>")) html = html.replace("</main>", `${block}</main>`);
  fs.writeFileSync(file, html, "utf8");
}

write(path.join(PUBLIC, "puzzles", "index.html"), hubPage());
write(path.join(PUBLIC, "play", "game.html"), playPage());
write(path.join(PUBLIC, "_redirects"), redirects());
patchSiteNavigation();
patchHomepage();
console.log(`Sapiver Puzzles built: ${config.puzzles.length} puzzle games + ${(config.otherGames || []).length} other games; historic routes and corporate branding protected.`);
