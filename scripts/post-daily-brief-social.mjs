import fs from "node:fs";

const manifestPath = process.env.DAILY_BRIEF_MANIFEST;
const receiptPath = process.env.DISTRIBUTION_RECEIPT_PATH;
if (!manifestPath || !receiptPath) throw new Error("DAILY_BRIEF_MANIFEST and DISTRIBUTION_RECEIPT_PATH are required.");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const social = manifest.social || {};
const pageUrl = `https://suite.sapiverpress.co.uk/daily-brief/intelligence/${manifest.date}/`;
const pinImage = process.env.PINTEREST_IMAGE_URL || "https://suite.sapiverpress.co.uk/podcast/sapiver-forge-ai-briefing-cover-v1.png";
const receipt = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, "utf8")) : { date: manifest.date };

function first(...values) { return values.map((value) => String(value || "").trim()).find(Boolean) || ""; }
async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data).slice(0, 1000)}`);
  return data;
}
async function pinterestToken() {
  const direct = first(process.env.PINTEREST_ACCESS_TOKEN);
  if (direct) return direct;
  const refresh = first(process.env.PINTEREST_REFRESH_TOKEN);
  const id = first(process.env.PINTEREST_CLIENT_ID, process.env.PINTEREST_APP_ID);
  const secret = first(process.env.PINTEREST_CLIENT_SECRET, process.env.PINTEREST_APP_SECRET);
  const refreshOut = first(process.env.PINTEREST_REFRESH_TOKEN_OUT);
  if (!refresh || !id || !secret) throw new Error("Pinterest credentials are incomplete.");
  const data = await jsonFetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh })
  });
  if (!data.access_token) throw new Error("Pinterest refresh returned no access_token.");
  if (refreshOut) {
    if (!data.refresh_token) throw new Error("Pinterest continuous refresh returned no replacement refresh_token; refusing to continue without safe rotation.");
    fs.writeFileSync(refreshOut, `${data.refresh_token}\n`, { mode: 0o600 });
  }
  return data.access_token;
}
async function postFacebook() {
  if (receipt.facebook?.id) return receipt.facebook;
  const token = first(process.env.FB_PAGE_TOKEN, process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
  const id = first(process.env.FB_PAGE_ID, process.env.FACEBOOK_PAGE_ID);
  if (!token || !id) throw new Error("Facebook credentials are incomplete.");
  const data = await jsonFetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(id)}/feed`, {
    method: "POST",
    body: new URLSearchParams({ message: social.facebook_post, link: pageUrl, access_token: token })
  });
  return { id: data.id, published_at: new Date().toISOString() };
}
async function postPinterest() {
  if (receipt.pinterest?.id) return receipt.pinterest;
  const token = await pinterestToken();
  let boardId = first(process.env.PINTEREST_BOARD_ID);
  if (!boardId) {
    const wanted = first(process.env.PINTEREST_BOARD_NAME, "Sapiver Forge").toLowerCase();
    const matches = [];
    let bookmark = "";
    do {
      const url = new URL("https://api.pinterest.com/v5/boards");
      url.searchParams.set("page_size", "100");
      if (bookmark) url.searchParams.set("bookmark", bookmark);
      const data = await jsonFetch(url, { headers: { Authorization: `Bearer ${token}` } });
      matches.push(...(data.items || []).filter(b => String(b.name || "").trim().toLowerCase() === wanted));
      bookmark = data.bookmark || "";
    } while (bookmark);
    if (matches.length !== 1) throw new Error("Set PINTEREST_BOARD_ID: no unique existing Sapiver Forge board was found.");
    boardId = matches[0].id;
  }
  const data = await jsonFetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      board_id: boardId,
      title: String(social.pinterest_title || social.lead_headline || "Sapiver Forge Daily Brief").slice(0, 100),
      description: String(social.pinterest_description || "").slice(0, 800),
      link: pageUrl,
      media_source: { source_type: "image_url", url: pinImage, is_standard: true }
    })
  });
  return { id: data.id, published_at: new Date().toISOString() };
}

// Save each channel immediately and retain IDs when another channel fails.
for (const [channel, post] of [["facebook", postFacebook], ["pinterest", postPinterest]]) {
  try {
    receipt[channel] = await post();
    delete receipt[`${channel}_error`];
  } catch (error) {
    receipt[`${channel}_error`] = error.message;
  }
  receipt.updated_at = new Date().toISOString();
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.facebook?.id || !receipt.pinterest?.id) process.exitCode = 1;
