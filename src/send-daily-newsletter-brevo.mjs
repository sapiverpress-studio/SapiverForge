import fs from "node:fs";
import path from "node:path";
import { resolveBrevoListId } from "./brevo-list-resolver.mjs";
import { isBrevoEmptyRecipientsError } from "./brevo-campaign-errors.mjs";

const ROOT = process.cwd();
const date = String(process.env.NEWS_INTELLIGENCE_DATE || new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date())).trim();
const mode = String(process.env.BREVO_SEND_MODE || "draft").toLowerCase();
const approved = String(process.env.NEWSLETTER_APPROVED || "false").toLowerCase() === "true";
const apiKey = process.env.BREVO_API_KEY;
const fallbackListId = Number(process.env.BREVO_LIST_ID);
const targetListName = String(process.env.BREVO_TARGET_LIST_NAME || "").trim();
const senderEmail = process.env.BREVO_SENDER_EMAIL || "clearforge@sapiverpress.co.uk";
const senderName = process.env.BREVO_SENDER_NAME || "Sapiver Forge";
const dir = path.join(ROOT, "news-intelligence", date);
const htmlPath = path.join(dir, "newsletter.html");
const metaPath = path.join(dir, "newsletter-metadata.json");

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("NEWS_INTELLIGENCE_DATE must use YYYY-MM-DD.");
if (!new Set(["none", "draft", "send"]).has(mode)) throw new Error("BREVO_SEND_MODE must be none, draft or send.");
if (mode === "none") {
  console.log("Brevo step disabled for this run.");
  process.exit(0);
}
if (!apiKey) throw new Error("Missing BREVO_API_KEY.");
if (!Number.isInteger(fallbackListId) || fallbackListId < 1) throw new Error("BREVO_LIST_ID must be a positive integer.");
if (!fs.existsSync(htmlPath) || !fs.existsSync(metaPath)) throw new Error(`Missing daily intelligence newsletter in ${dir}.`);

const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
if (metadata.status === "blocked") throw new Error("Newsletter is blocked because the intelligence edition did not meet verification thresholds.");
if (mode === "send" && !approved) throw new Error("Live newsletter send blocked: NEWSLETTER_APPROVED=true is required from an explicit human release run.");

if (String(process.env.BREVO_CORRECTION_MODE || "false").toLowerCase() === "true") {
  // A previously sent campaign cannot be edited. A corrected edition gets a separate DRAFT.
  if (mode !== "draft") throw new Error("Correction mode only prepares a draft. Send it manually from Brevo after review.");
  if (metadata.status !== "sent" || !metadata.sent_at) throw new Error("Correction mode requires an already-sent original campaign.");
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  if (!manifest.editorial_revision) throw new Error("Correction revision marker is missing.");
  const html = fs.readFileSync(htmlPath, "utf8");
  if (!html.includes("That total includes a $30 million retention pool") ||
      !html.includes("If you received an OpenCode Console breach notice") ||
      html.includes("$180M over three years, plus a $30M")) {
    throw new Error("Corrected Brevo HTML failed the editorial content gate; no draft was created.");
  }
  const listId = targetListName
    ? await resolveBrevoListId({ apiKey, fallbackListId, targetListName })
    : fallbackListId;
  const subject = "Updated: Sapiver Forge Daily Brief — " + date;
  const headers = { "api-key": apiKey, "content-type": "application/json", accept: "application/json" };
  let correctedId = Number(metadata.correction_campaign_id || 0) || null;
  const payload = {
    name: "Sapiver Forge Daily Brief " + date + " — corrected edition",
    subject,
    sender: { name: senderName, email: senderEmail },
    htmlContent: html,
    recipients: { listIds: [listId] }
  };
  if (!correctedId) Object.assign(payload, {
    type: "classic", inlineImageActivation: false, mirrorActive: true,
    footer: "You received this because you subscribed to Sapiver Forge."
  });
  const url = "https://api.brevo.com/v3/emailCampaigns" + (correctedId ? "/" + correctedId : "");
  const response = await fetch(url, {
    method: correctedId ? "PUT" : "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error("Brevo corrected-draft " + (correctedId ? "update" : "creation") +
    " failed (" + response.status + "): " + responseText);
  if (!correctedId) {
    correctedId = Number(JSON.parse(responseText).id);
    if (!Number.isInteger(correctedId) || correctedId < 1) throw new Error("Brevo did not provide a new draft id.");
  }
  const verify = await fetch("https://api.brevo.com/v3/emailCampaigns/" + correctedId, { headers });
  const verifyText = await verify.text();
  if (!verify.ok) throw new Error("Brevo draft readback failed (" + verify.status + "): " + verifyText);
  const draft = JSON.parse(verifyText);
  if (draft.status !== "draft" ||
      !String(draft.htmlContent || "").includes("That total includes a $30 million retention pool") ||
      !String(draft.htmlContent || "").includes("If you received an OpenCode Console breach notice")) {
    throw new Error("Brevo draft readback did not confirm corrected content and draft status.");
  }
  Object.assign(metadata, {
    correction_campaign_id: correctedId,
    correction_campaign_status: "draft_verified",
    correction_subject: subject,
    correction_revision: manifest.editorial_revision,
    correction_campaign_updated_at: new Date().toISOString()
  });
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
  console.log("Brevo corrected campaign " + correctedId + " verified as DRAFT. Original sent campaign " +
    metadata.brevo_campaign_id + " preserved. NO EMAIL SENT.");
  process.exit(0);
}
if (metadata.status === "sent") {
  console.log(`Daily Brief ${date} is already marked sent; refusing duplicate delivery.`);
  process.exit(0);
}

const listId = targetListName
  ? await resolveBrevoListId({ apiKey, fallbackListId, targetListName })
  : fallbackListId;
const listLabel = targetListName || `existing Brevo list ${listId}`;
const htmlContent = fs.readFileSync(htmlPath, "utf8");
const headers = { "api-key": apiKey, "content-type": "application/json", accept: "application/json" };
let campaignId = Number(metadata.brevo_campaign_id || 0) || null;

if (!campaignId) {
  const createResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `Sapiver Forge Daily Brief ${date}`,
      subject: metadata.subject || `Sapiver Forge Daily Brief — ${date}`,
      sender: { name: senderName, email: senderEmail },
      type: "classic",
      htmlContent,
      recipients: { listIds: [listId] },
      inlineImageActivation: false,
      mirrorActive: true,
      footer: "You received this because you subscribed to Sapiver Forge."
    })
  });
  const createText = await createResponse.text();

  if (!createResponse.ok && isBrevoEmptyRecipientsError(createResponse.status, createText)) {
    Object.assign(metadata, {
      status: "ready_no_subscribers",
      brevo_campaign_id: null,
      recipient_list_id: listId,
      email_skipped_reason: "no_subscribers_in_target_list",
      email_skipped_at: new Date().toISOString()
    });
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
    console.log(`No contacts are currently in ${listLabel}; Brevo draft/send skipped without failing the Daily Brief run.`);
    process.exit(0);
  }

  if (!createResponse.ok) throw new Error(`Brevo campaign creation failed (${createResponse.status}): ${createText}`);
  const campaign = JSON.parse(createText);
  if (!campaign.id) throw new Error("Brevo did not return a campaign id.");
  campaignId = campaign.id;
  Object.assign(metadata, {
    status: "brevo_draft",
    brevo_campaign_id: campaignId,
    recipient_list_id: listId,
    campaign_created_at: new Date().toISOString(),
    email_skipped_reason: null,
    email_skipped_at: null
  });
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
  console.log(`Created Brevo draft campaign ${campaignId} for Sapiver Forge Daily Brief ${date} using ${listLabel}.`);
}

if (mode === "draft") {
  // Synchronise actual Brevo draft content with the current repository source.
  // Previously this path returned early and left existing drafts stale.
  const updateResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name: `Sapiver Forge Daily Brief ${date}`,
      subject: metadata.subject || `Sapiver Forge Daily Brief — ${date}`,
      sender: { name: senderName, email: senderEmail },
      htmlContent,
      recipients: { listIds: [listId] }
    })
  });
  const updateText = await updateResponse.text();
  if (!updateResponse.ok) throw new Error(`Brevo draft sync failed (${updateResponse.status}): ${updateText}`);
  const verifyResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}`, { headers });
  const verifyText = await verifyResponse.text();
  if (!verifyResponse.ok) throw new Error(`Brevo draft verification failed (${verifyResponse.status}): ${verifyText}`);
  const verified = JSON.parse(verifyText);
  if (verified.status !== "draft" || !verified.htmlContent ||
      !String(verified.htmlContent).includes("<main")) {
    throw new Error("Brevo draft verification failed: expected a draft containing the repository newsletter HTML.");
  }
  Object.assign(metadata, { campaign_updated_at: new Date().toISOString(), status: "brevo_draft" });
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
  console.log(`Brevo campaign ${campaignId} is an updated, verified draft pending human approval.`);
  process.exit(0);
}

const updateResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}`, {
  method: "PUT",
  headers,
  body: JSON.stringify({
    name: `Sapiver Forge Daily Brief ${date}`,
    subject: metadata.subject || `Sapiver Forge Daily Brief — ${date}`,
    sender: { name: senderName, email: senderEmail },
    htmlContent,
    recipients: { listIds: [listId] }
  })
});
const updateText = await updateResponse.text();
if (!updateResponse.ok) throw new Error(`Brevo campaign update failed (${updateResponse.status}): ${updateText}`);
Object.assign(metadata, {
  campaign_updated_at: new Date().toISOString(),
  candidate_id: metadata.candidate_id
});
fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
console.log(`Updated Brevo campaign ${campaignId} with the final repository newsletter HTML.`);

const sendResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`, {
  method: "POST",
  headers
});
const sendText = await sendResponse.text();
if (!sendResponse.ok) throw new Error(`Brevo campaign send failed (${sendResponse.status}): ${sendText}`);

Object.assign(metadata, {
  status: "sent",
  approved: true,
  sent_at: new Date().toISOString(),
  brevo_campaign_id: campaignId,
  recipient_list_id: listId,
  email_skipped_reason: null,
  email_skipped_at: null
});
fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
console.log(`Sent Sapiver Forge Daily Brief ${date} through Brevo campaign ${campaignId} using ${listLabel}.`);
