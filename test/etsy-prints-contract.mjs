import assert from 'node:assert/strict';
import { loadSapiverPrints } from '../lib/etsy-prints.mjs';
import functionHandler from '../netlify/functions/etsy-prints.mjs';
import { makePublicEtsyFeed, validatePublicEtsyFeed, PUBLIC_ETSY_FEED_URL, MAX_PUBLIC_ETSY_FEED_AGE_MS } from '../lib/etsy-public-feed.mjs';

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

const valid = makePublicEtsyFeed(data);
assert.equal(valid.schemaVersion,1);
assert.equal(valid.shop,'SapiverPrints');
assert.equal(valid.items.length,1);
assert.deepEqual(Object.keys(valid.items[0]).sort(),['description','id','image','imageAlt','title','url']);
assert.equal(validatePublicEtsyFeed(valid).items.length,1);
assert.throws(() => makePublicEtsyFeed({...data,shop:'SapiverPress'}),/unexpected Etsy shop/);
assert.throws(() => makePublicEtsyFeed({...data,activeListingIds:[42,44,46]}),/missing photos/);
assert.throws(() => validatePublicEtsyFeed({...valid,generatedAt:new Date(Date.now()-MAX_PUBLIC_ETSY_FEED_AGE_MS-1000).toISOString()}),/stale/);
assert.throws(() => validatePublicEtsyFeed({...valid,generatedAt:new Date(Date.now()+3600000).toISOString()}),/future date/);
assert.throws(() => validatePublicEtsyFeed({...valid,items:[{...valid.items[0],url:'https://evil.test/listing/42'}]}),/destination/);

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), PUBLIC_ETSY_FEED_URL);
    assert.ok(options.signal);
    return {ok:true,status:200,json:async()=>valid};
  };
  const response = await functionHandler(new Request('https://test.invalid/api/etsy-prints'));
  assert.equal(response.status,200);
  assert.match(response.headers.get('cache-control'), /s-maxage=/);
  assert.equal((await response.json()).items.length,1);
  const invalid = await functionHandler(new Request('https://test.invalid/api/etsy-prints',{method:'POST'}));
  assert.equal(invalid.status,405);

  globalThis.fetch = async()=>({ok:true,json:async()=>({...valid,generatedAt:new Date(Date.now()-MAX_PUBLIC_ETSY_FEED_AGE_MS-1000).toISOString()})});
  const stale = await functionHandler(new Request('https://test.invalid/api/etsy-prints'));
  assert.equal(stale.status,503);
  assert.equal(stale.headers.get('cache-control'),'no-store');

  globalThis.fetch = async()=>({ok:false,status:403});
  const failed = await functionHandler(new Request('https://test.invalid/api/etsy-prints'));
  assert.equal(failed.status,503);
  assert.equal(failed.headers.get('cache-control'),'no-store');
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Etsy catalogue contract passed: correct shop, sanitized products, stale/partial blocking, Netlify responses.');
