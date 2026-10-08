import assert from 'node:assert/strict';
import { loadSapiverPrints } from '../lib/etsy-prints.mjs';
import functionHandler from '../netlify/functions/etsy-prints.mjs';

const makeFetch = () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push(String(url));
    assert.equal(init.headers['x-api-key'], 'test-key:test-secret');
    const parsed = new URL(url);
    let results = [];
    if (parsed.pathname.endsWith('/shops')) {
      results = [
        {shop_name:'SapiverPress',shop_id:999},
        {shop_name:'SapiverPrints',shop_id:123}
      ];
    } else if (parsed.pathname.endsWith('/shops/123/listings/active')) {
      results = [
        {shop_id:123,listing_id:42,state:'active'},
        {shop_id:123,listing_id:44,state:'active'}
      ];
    } else if (parsed.pathname.endsWith('/listings/batch')) {
      assert.equal(parsed.searchParams.get('listing_ids'),'42,44');
      assert.equal(parsed.searchParams.get('includes'),'Images');
      results = [
        {shop_id:123,listing_id:42,state:'active',title:'Sample poster',description:'Educational print',images:[{rank:1,url_570xN:'https://i.etsystatic.com/42.png'}]},
        {shop_id:123,listing_id:44,state:'draft',title:'Not public',images:[{url_570xN:'https://i.etsystatic.com/44.png'}]}
      ];
    } else throw Error('Unexpected endpoint '+parsed.pathname);
    return {ok:true,status:200,json:async()=>({count:results.length,results})};
  };
  return {fetchImpl,seen};
};
const {fetchImpl,seen} = makeFetch();
const data = await loadSapiverPrints({keystring:'test-key',sharedSecret:'test-secret',fetchImpl});
assert.equal(data.shop,'SapiverPrints');
assert.equal(data.shopId,123);
assert.deepEqual(data.activeListingIds,[42,44]);
assert.deepEqual(data.items.map(p=>p.id),[42]);
assert.equal(data.items[0].url,'https://www.etsy.com/listing/42');
assert.equal(seen.length,3);
assert.ok(seen.every(x=>!x.includes('999')));
await assert.rejects(loadSapiverPrints({keystring:'test-key',sharedSecret:''}),/must both be set/);
await assert.rejects(loadSapiverPrints({keystring:'test-key',sharedSecret:'test-secret',
  fetchImpl:async()=>({ok:true,status:200,json:async()=>({results:[{shop_name:'SapiverPress',shop_id:999}]})})}),/Exact Etsy shop/);

const originalFetch = globalThis.fetch;
const envKey = process.env.ETSY_PRINTS_KEYSTRING;
const envSecret = process.env.ETSY_PRINTS_SHARED_SECRET;
try {
  globalThis.fetch = makeFetch().fetchImpl;
  process.env.ETSY_PRINTS_KEYSTRING = 'test-key';
  process.env.ETSY_PRINTS_SHARED_SECRET = 'test-secret';
  const response = await functionHandler(new Request('https://test.invalid/api/etsy-prints'));
  assert.equal(response.status,200);
  assert.match(response.headers.get('cache-control'), /max-age=300/);
  assert.equal((await response.json()).items.length,1);
  const invalid = await functionHandler(new Request('https://test.invalid/api/etsy-prints',{method:'POST'}));
  assert.equal(invalid.status,405);
  globalThis.fetch = async()=>({ok:false,status:403});
  const failed = await functionHandler(new Request('https://test.invalid/api/etsy-prints'));
  assert.equal(failed.status,503);
  assert.equal(failed.headers.get('cache-control'),'no-store');
} finally {
  globalThis.fetch = originalFetch;
  if (envKey === undefined) delete process.env.ETSY_PRINTS_KEYSTRING; else process.env.ETSY_PRINTS_KEYSTRING = envKey;
  if (envSecret === undefined) delete process.env.ETSY_PRINTS_SHARED_SECRET; else process.env.ETSY_PRINTS_SHARED_SECRET = envSecret;
}
console.log('Etsy API contract passed: exact shop, active-only, photos, safety failures, HTTP statuses.');
