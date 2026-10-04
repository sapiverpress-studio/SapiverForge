import fs from "node:fs";

const source = fs.readFileSync("src/generate-news-intelligence.mjs", "utf8");

if (/limitWords\(lead\.confirmed_fact\s*,\s*18\)/.test(source)) {
  throw new Error("Daily Brief social Short must not truncate confirmed_fact by word count.");
}

if (!source.includes('const confirmedSentence = lead ? firstSentence(lead.confirmed_fact) : "";')) {
  throw new Error("Daily Brief social Short must use the first complete confirmed sentence.");
}

if (!source.includes('const spokenScript = lead ? `${lead.headline}. ${confirmedSentence} Read the Sapiver Forge Daily Brief.` : "";')) {
  throw new Error("Daily Brief social Short must be assembled from headline + complete sentence + CTA.");
}

console.log("Daily Brief Short sentence contract passed.");
