// Shared public catalogue contract. No Etsy credentials or private order data.
export const PUBLIC_ETSY_FEED_URL = 'https://raw.githubusercontent.com/sapiverpress-studio/SapiverForge/main/data/etsy-public-catalog.json';
export const MAX_PUBLIC_ETSY_FEED_AGE_MS = 5.5 * 60 * 60 * 1000;
const EXPECTED_SHOP = 'SapiverPrints';
const VALID_IMAGE = /^https:\/\/[^/]+\.etsystatic\.com\//i;

function product(item) {
  const id = Number(item?.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw Error('Invalid listing ID in public feed');
  const url = 'https://www.etsy.com/listing/' + id;
  if (item.url !== url) throw Error('Unexpected Etsy destination in public feed');
  if (typeof item.image !== 'string' || !VALID_IMAGE.test(item.image)) throw Error('Unexpected Etsy image domain');
  const title = String(item.title || '').trim();
  if (!title || title.length > 220) throw Error('Invalid public listing title');
  if (typeof item.description !== 'string' || item.description.length > 190) throw Error('Invalid public listing description');
  if (typeof item.imageAlt !== 'string' || item.imageAlt.length > 220) throw Error('Invalid public image description');
  return { id, title, description: item.description, image: item.image, imageAlt: item.imageAlt, url };
}

export function makePublicEtsyFeed(etsyResult) {
  if (etsyResult?.shop !== EXPECTED_SHOP || !Number.isSafeInteger(etsyResult.shopId)) {
    throw Error('Refusing to export an unexpected Etsy shop');
  }
  if (!Array.isArray(etsyResult.activeListingIds) || !Array.isArray(etsyResult.items)) {
    throw Error('Etsy data is incomplete');
  }
  const items = etsyResult.items.map(product);
  if (new Set(items.map(item => item.id)).size !== items.length) throw Error('Duplicate Etsy listing');
  if (items.length !== etsyResult.activeListingIds.length) {
    throw Error('Active Etsy listings missing photos or complete public fields; refusing partial feed');
  }
  const feed = {
    schemaVersion: 1,
    shop: EXPECTED_SHOP,
    generatedAt: etsyResult.checkedAt,
    items
  };
  validatePublicEtsyFeed(feed, { maxAgeMs: MAX_PUBLIC_ETSY_FEED_AGE_MS });
  return feed;
}

export function validatePublicEtsyFeed(feed, { now = Date.now(), maxAgeMs = MAX_PUBLIC_ETSY_FEED_AGE_MS } = {}) {
  if (!feed || feed.schemaVersion !== 1 || feed.shop !== EXPECTED_SHOP ||
      !Array.isArray(feed.items) || feed.items.length > 1000) throw Error('Unexpected public Etsy feed');
  const date = String(feed.generatedAt || '');
  const checked = Date.parse(date);
  if (!Number.isFinite(checked) || !/^\d{4}-\d{2}-\d{2}T/.test(date)) throw Error('Missing public feed timestamp');
  const ageMs = now - checked;
  if (ageMs < -5 * 60 * 1000 || ageMs >= maxAgeMs) throw Error('Public Etsy feed is stale or has a future date');
  const items = feed.items.map(product);
  if (new Set(items.map(item => item.id)).size !== items.length) throw Error('Duplicate Etsy listing');
  return { shop: EXPECTED_SHOP, checkedAt: date, items, ageMs };
}
