import fs from "node:fs";
import path from "node:path";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const esc = (value) => clean(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function absoluteUrl(baseUrl, value) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const suffix = String(value || "").startsWith("/") ? value : `/${value}`;
  return `${base}${suffix}`;
}

function extract(html, pattern) {
  return clean(String(html || "").match(pattern)?.[1] || "");
}

export function collectDailyEmailExtras({ root, baseUrl }) {
  const extras = {};
  const lessonsRoot = path.join(root, "public", "learn", "lessons");
  if (fs.existsSync(lessonsRoot)) {
    const days = fs.readdirSync(lessonsRoot).filter((name) => /^day-\d{3}$/.test(name)).sort().reverse();
    for (const folder of days) {
      const file = path.join(lessonsRoot, folder, "index.html");
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf8");
      const rawTitle = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = rawTitle.replace(/^Sapiver Learn\s*[—–-]\s*Day\s*\d+\s*:\s*/i, "");
      extras.learn = {
        label: `Sapiver Learn · ${folder.replace("day-", "Day ")}`,
        title: title || rawTitle || "Latest Sapiver Learn lesson",
        summary: extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
        url: absoluteUrl(baseUrl, `/learn/lessons/${folder}/`)
      };
      break;
    }
  }

  const parentsManifest = path.join(root, "parents-projects", "manifest.json");
  if (fs.existsSync(parentsManifest)) {
    const manifest = JSON.parse(fs.readFileSync(parentsManifest, "utf8"));
    const project = (Array.isArray(manifest.projects) ? manifest.projects : [])
      .filter((item) => item?.status === "ready" && item?.path)
      .sort((a, b) => Number(b.day || 0) - Number(a.day || 0))[0];
    if (project) extras.parents = {
      label: `AI Inquisitive Parents · Day ${String(project.day).padStart(3, "0")}`,
      title: clean(project.title),
      summary: clean(project.summary),
      url: absoluteUrl(baseUrl, project.path),
      image: project.card_image ? absoluteUrl(baseUrl, project.card_image) : ""
    };
  }
  return extras;
}

export function renderDailyEmailExtrasHtml(extras) {
  const cards = [extras.learn, extras.parents].filter(Boolean).map((item) => `<section style="margin:0 0 16px;padding:18px;border:1px solid #d7dedb;border-radius:12px;background:#ffffff">${item.image ? `<img src="${esc(item.image)}" alt="" width="180" style="display:block;width:180px;max-width:100%;height:auto;border-radius:10px;margin:0 0 14px">` : ""}<p style="margin:0 0 5px;text-transform:uppercase;letter-spacing:.08em;font-size:12px;color:#68756f">${esc(item.label)}</p><h3 style="font-size:21px;line-height:1.25;margin:0 0 8px">${esc(item.title)}</h3>${item.summary ? `<p style="margin:0 0 12px">${esc(item.summary)}</p>` : ""}<p style="margin:0"><a href="${esc(item.url)}">Open ${esc(item.title)}</a></p></section>`).join("");
  if (!cards) return "";
  return `<section style="background:#f4f1e8;padding:20px;margin:26px 0"><p style="margin:0 0 5px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:#68756f">More from Sapiver Press</p><h2 style="margin:0 0 16px">New today</h2>${cards}</section>`;
}

export function renderDailyEmailExtrasMarkdown(extras) {
  const lines = [extras.learn, extras.parents].filter(Boolean).map((item) => `### ${item.label}: ${item.title}\n\n${item.summary ? `${item.summary}\n\n` : ""}[Open ${item.title}](${item.url})`);
  return lines.length ? `## New today from Sapiver Press\n\n${lines.join("\n\n")}` : "";
}
