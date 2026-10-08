import { loadSapiverPrints } from '../../lib/etsy-prints.mjs';

// Deployed Netlify Function; Etsy secrets remain on the server, never in page HTML.
export default async function handler(request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  try {
    const data = await loadSapiverPrints({
      keystring: typeof Netlify === 'undefined' ? process.env.ETSY_PRINTS_KEYSTRING : Netlify.env.get('ETSY_PRINTS_KEYSTRING'),
      sharedSecret: typeof Netlify === 'undefined' ? process.env.ETSY_PRINTS_SHARED_SECRET : Netlify.env.get('ETSY_PRINTS_SHARED_SECRET')
    });
    // Successful responses are fresh for five minutes (well under Etsy's six-hour maximum).
    return new Response(JSON.stringify({shop: data.shop, checkedAt: data.checkedAt, items: data.items}), {
      status: 200,
      headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'public, max-age=300, s-maxage=300', 'x-content-type-options':'nosniff' }
    });
  } catch (error) {
    console.error('SapiverPrints catalogue unavailable:', error.message);
    // Never serve stale or incomplete merchandise data when Etsy is unavailable.
    return new Response(JSON.stringify({error:'Current Etsy listings temporarily unavailable'}), {
      status: 503,
      headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }
    });
  }
}
export const config = { path: '/api/etsy-prints' };
