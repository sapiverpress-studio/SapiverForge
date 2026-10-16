import fs from 'node:fs';
import path from 'node:path';
import { loadSapiverPrints } from '../lib/etsy-prints.mjs';
import { makePublicEtsyFeed } from '../lib/etsy-public-feed.mjs';

const result = await loadSapiverPrints({
  keystring: process.env.ETSY_PRINTS_KEYSTRING,
  sharedSecret: process.env.ETSY_PRINTS_SHARED_SECRET
});
const publicFeed = makePublicEtsyFeed(result);
const publicPath = path.join(process.cwd(), 'data/etsy-public-catalog.json');
// Refresh the timestamp on every successful run; never publish a stale snapshot.
fs.writeFileSync(publicPath, JSON.stringify(publicFeed, null, 2) + '\n');
const location = path.join(process.cwd(), 'data/etsy-active-listing-ids.json');
let previous = null;
if (fs.existsSync(location)) previous = JSON.parse(fs.readFileSync(location, 'utf8'));
const ids = [...new Set(result.activeListingIds)].sort((a,b) => a-b);
const before = Array.isArray(previous?.ids) ? previous.ids : [];
const added = ids.filter(id => !before.includes(id));
const removed = before.filter(id => !ids.includes(id));
const data = { shop: result.shop, shopId: result.shopId, ids };
if (JSON.stringify(data) !== JSON.stringify(previous)) {
  fs.writeFileSync(location, JSON.stringify(data, null, 2) + '\n');
}
const lines = [
  '## SapiverPrints public catalogue refresh',
  '',
  '- Etsy shop: **' + result.shop + '** (ID ' + result.shopId + ')',
  '- Active listings: **' + ids.length + '**',
  '- Listings with confirmed images: **' + result.items.length + '**',
  '- New listing IDs since last snapshot: **' + added.length + '**',
  '- Removed listing IDs since last snapshot: **' + removed.length + '**',
  '- Checked: ' + result.checkedAt,
  '',
  ...(added.length ? ['New: ' + added.join(', '), ''] : []),
  ...(removed.length ? ['Removed: ' + removed.join(', '), ''] : []),
  'The dated, public-only feed is consumed by the website and expires automatically. The ID snapshot is monitoring only.'
];
const summary = lines.join('\n') + '\n';
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
