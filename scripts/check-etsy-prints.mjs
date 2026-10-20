import fs from 'node:fs';
import path from 'node:path';
import { loadSapiverPrints } from '../lib/etsy-prints.mjs';
import { makePublicEtsyFeed } from '../lib/etsy-public-feed.mjs';
import { etsyPinterestSyncPlan } from '../lib/etsy-pinterest-sync.mjs';

const result = await loadSapiverPrints({
  keystring: process.env.ETSY_PRINTS_KEYSTRING,
  sharedSecret: process.env.ETSY_PRINTS_SHARED_SECRET
});
const publicFeed = makePublicEtsyFeed(result);
const publicPath = path.join(process.cwd(), 'data/etsy-public-catalog.json');
const location = path.join(process.cwd(), 'data/etsy-active-listing-ids.json');
const previousFeed = fs.existsSync(publicPath) ? JSON.parse(fs.readFileSync(publicPath, 'utf8')) : null;
const previous = fs.existsSync(location) ? JSON.parse(fs.readFileSync(location, 'utf8')) : null;
const ids = [...new Set(result.activeListingIds)].sort((a,b) => a-b);
const before = Array.isArray(previous?.ids) ? previous.ids : [];
const plan=etsyPinterestSyncPlan({previousFeed,currentFeed:publicFeed,previousIds:before});
const added = plan.newIds;
const removed = plan.removedIds;
const data = {shop:result.shop,shopId:result.shopId,ids};
// Do not create 48 timestamp-only commits daily; the feed still refreshes within 4h,
// before the 5.5h freshness limit of the public shop and Comic.
if(plan.needsRefresh)fs.writeFileSync(publicPath,JSON.stringify(publicFeed,null,2)+'\n');
if(JSON.stringify(data)!==JSON.stringify(previous))
  fs.writeFileSync(location,JSON.stringify(data,null,2)+'\n');
// GitHub Actions dispatch only AFTER the validated catalogue is committed/pushed.
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,
  'pinterest_new_listings='+String(plan.shouldDispatch)+'\n'+
  'pinterest_new_count='+String(added.length)+'\n');
// Expose no Etsy private credentials, tokens or listing descriptions in workflow outputs.
const lines = [
  '## SapiverPrints public catalogue refresh',
  '',
  '- Etsy shop: **' + result.shop + '** (ID ' + result.shopId + ')',
  '- Active listings: **' + ids.length + '**',
  '- Listings with confirmed images: **' + result.items.length + '**',
  '- New listing IDs since last snapshot: **' + added.length + '**',
  '- Removed listing IDs since last snapshot: **' + removed.length + '**',
  '- Checked: ' + result.checkedAt,
  '- Feed committed this run: **' + (plan.needsRefresh?'yes':'unchanged') + '**',
  '- New listing handoff eligible: **' + (plan.shouldDispatch?'yes':'no') + '**',
  '',
  ...(added.length ? ['New: ' + added.join(', '), ''] : []),
  ...(removed.length ? ['Removed: ' + removed.join(', '), ''] : []),
  'The dated, public-only feed is consumed by the website and expires automatically. The ID snapshot is monitoring only.'
];
const summary = lines.join('\n') + '\n';
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
