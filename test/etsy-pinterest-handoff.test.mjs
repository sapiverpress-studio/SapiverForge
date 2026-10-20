import test from 'node:test';
import assert from 'node:assert/strict';
import {etsyPinterestSyncPlan} from '../lib/etsy-pinterest-sync.mjs';

const now=Date.parse('2026-10-20T04:00:00Z');
const feed=(ids,checked=now,items=ids.map(id=>({id,title:'Poster '+id,description:'An original print'})))=>
 ({shop:'SapiverPrints',generatedAt:new Date(checked).toISOString(),items});
const plan=(oldFeed,newFeed,oldIds)=>etsyPinterestSyncPlan({previousFeed:oldFeed,currentFeed:newFeed,previousIds:oldIds,now});

test('new active listing triggers immediate handoff after refreshed feed commit',()=>{
 const result=plan(feed([101,102]),feed([101,102,103]),[101,102]);
 assert.deepEqual(result.newIds,[103]);
 assert.equal(result.changed,true);
 assert.equal(result.needsRefresh,true);
 assert.equal(result.shouldDispatch,true);
});
test('ordinary half-hour poll does not cause a needless GitHub feed commit or dispatch',()=>{
 const result=plan(feed([101,102],now-30*60000),feed([101,102]),[101,102]);
 assert.equal(result.needsRefresh,false);
 assert.equal(result.shouldDispatch,false);
});
test('unchanged feed refreshes at four hours to stay within 5.5h expiry',()=>{
 const result=plan(feed([101],now-4*3600000),feed([101]),[101]);
 assert.equal(result.needsRefresh,true);
 assert.equal(result.shouldDispatch,false);
});
test('image or description updates refresh catalogue but never duplicate existing Pinterest Pin',()=>{
 const old=feed([101]);
 const changed=feed([101]);changed.items[0].description='New approved description';
 const result=plan(old,changed,[101]);
 assert.equal(result.changed,true);
 assert.equal(result.needsRefresh,true);
 assert.equal(result.shouldDispatch,false);
});
test('removed listings update feed but cannot dispatch deactivated listings',()=>{
 const result=plan(feed([101,102]),feed([101]),[101,102]);
 assert.deepEqual(result.removedIds,[102]);
 assert.equal(result.shouldDispatch,false);
});
test('feed ordering alone cannot cause false positive new listing handoff',()=>{
 const result=plan(feed([101,102]),feed([102,101]),[101,102]);
 assert.equal(result.changed,false);
 assert.equal(result.needsRefresh,false);
 assert.equal(result.shouldDispatch,false);
});
test('wrong shop and duplicated active listing IDs fail closed',()=>{
 assert.throws(()=>plan(null,{...feed([101]),shop:'another'},[]),/Unexpected/);
 assert.throws(()=>plan(null,feed([101,101]),[]),/Bad live listing IDs/);
});
test('first valid catalogue includes active IDs and triggers handoff for any missing historical Pins',()=>{
 const result=plan(null,feed([101,102]),[]);
 assert.deepEqual(result.newIds,[101,102]);
 assert.equal(result.shouldDispatch,true);
});
