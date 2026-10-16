import { PUBLIC_ETSY_FEED_URL, MAX_PUBLIC_ETSY_FEED_AGE_MS, validatePublicEtsyFeed } from '../../lib/etsy-public-feed.mjs';

// Public-only GitHub snapshot. No Etsy or GitHub credentials are needed in Netlify.
export default async function handler(request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  try {
    const response = await fetch(PUBLIC_ETSY_FEED_URL, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw Error('Public catalogue feed HTTP ' + response.status);
    const source = await response.json();
    const data = validatePublicEtsyFeed(source);
    // Never cache beyond expiry, even if GitHub or its CDN misses a refresh.
    const remainingSeconds = Math.floor((MAX_PUBLIC_ETSY_FEED_AGE_MS - data.ageMs) / 1000);
    const ttl = Math.max(0, Math.min(300, remainingSeconds - 60));
    return new Response(JSON.stringify({ shop: data.shop, checkedAt: data.checkedAt, items: data.items }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=' + ttl,
        'x-content-type-options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('SapiverPrints public feed unavailable:', String(error?.message || error).slice(0, 180));
    // Fail closed. Show the Etsy shop button rather than out-of-date inventory.
    return new Response(JSON.stringify({ error: 'Current Etsy listings temporarily unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
}
export const config = { path: '/api/etsy-prints' };
