// Public-listings-only Etsy API adapter. No seller OAuth or write endpoints.
const API = 'https://api.etsy.com/v3/application';
const SHOP = 'SapiverPrints';

async function getJson(path, { keystring, sharedSecret, fetchImpl }) {
  const response = await fetchImpl(API + path, {
    headers: { 'x-api-key': keystring + ':' + sharedSecret, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Etsy API HTTP ' + response.status + ' for ' + path.split('?')[0]);
  const data = await response.json();
  if (!data || !Array.isArray(data.results)) throw new Error('Unexpected Etsy response shape');
  return data;
}

export async function loadSapiverPrints({keystring, sharedSecret, fetchImpl = fetch, maxListings = 1000} = {}) {
  if (!keystring || !sharedSecret) throw new Error('ETSY_PRINTS_KEYSTRING and ETSY_PRINTS_SHARED_SECRET must both be set');
  const auth = { keystring, sharedSecret, fetchImpl };
  const found = await getJson('/shops?shop_name=' + encodeURIComponent(SHOP) + '&limit=100', auth);
  const match = found.results.find(s => s.shop_name?.toLowerCase() === SHOP.toLowerCase());
  const shopId = Number(match?.shop_id);
  if (!Number.isSafeInteger(shopId) || shopId <= 0) throw new Error('Exact Etsy shop SapiverPrints not found; refusing to sync a different shop');

  const listingIds = [];
  for (let offset = 0; ; offset += 100) {
    const page = await getJson('/shops/' + shopId + '/listings/active?limit=100&offset=' + offset, auth);
    for (const row of page.results) {
      if (Number(row.shop_id) !== shopId) throw new Error('Wrong Etsy shop ID in listing response');
      if (row.state !== 'active') continue;
      const id = Number(row.listing_id);
      if (Number.isSafeInteger(id) && id > 0) listingIds.push(id);
    }
    if (listingIds.length > maxListings) throw new Error('Shop exceeds safe listing limit of ' + maxListings);
    if (page.results.length < 100) break;
    if (offset + 100 >= maxListings && page.results.length === 100) {
      throw new Error('Shop has at least ' + maxListings + ' products; increase limit before continuing');
    }
  }

  const items = [];
  for (let index = 0; index < listingIds.length; index += 100) {
    const ids = listingIds.slice(index, index + 100);
    // getListingsByListingIds requires a comma-delimited list; includes=Images is a public association.
    const batch = await getJson('/listings/batch?listing_ids=' + ids.join(',') + '&includes=Images', auth);
    for (const row of batch.results) {
      const id = Number(row.listing_id);
      if (!ids.includes(id) || Number(row.shop_id) !== shopId || row.state !== 'active') continue;
      const images = Array.isArray(row.images) ? row.images : [];
      const photo = images.slice().sort((a,b) => (a.rank ?? 0) - (b.rank ?? 0))[0];
      const image = photo?.url_570xN || photo?.url_fullxfull;
      if (!image || !/^https:\/\/[^/]+\.etsystatic\.com\//i.test(image)) continue;
      const title = String(row.title || '').trim().slice(0, 220);
      if (!title) continue;
      const description = String(row.description || '').replace(/\s+/g, ' ').trim().slice(0, 190);
      items.push({
        id: id,
        title: title,
        description: description,
        image: image,
        imageAlt: String(photo.alt_text || title).slice(0, 220),
        url: 'https://www.etsy.com/listing/' + id
      });
    }
  }
  return { shop: SHOP, shopId, checkedAt: new Date().toISOString(), activeListingIds: listingIds, items };
}
