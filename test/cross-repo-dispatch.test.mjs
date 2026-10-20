import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchComic} from '../lib/cross-repo-dispatch.mjs';
const input={edition_date:'2026-10-20',source_sha:'a'.repeat(40),candidate_id:'b'.repeat(64),confirm:'SEND'};
function fake(first,second=204){
 const requests=[];
 const fetchImpl=async(url,opts={})=>{
  requests.push({url,method:opts.method,body:JSON.parse(opts.body)});
  return {status:requests.length===1?first:second};
 };
 return {requests,fetchImpl};
}
test('a valid approved release uses standard GitHub Actions dispatch',async()=>{
 const x=fake(204);
 assert.equal((await dispatchComic({kind:'forge',inputs:input,token:'private',fetchImpl:x.fetchImpl})).route,'workflow_dispatch');
 assert.equal(x.requests.length,1);
 assert.equal(x.requests[0].body.ref,'main');
 assert.deepEqual(x.requests[0].body.inputs,input);
});
test('Actions 403 transparently falls back to Contents-permission repository_dispatch',async()=>{
 const x=fake(403,204);
 assert.equal((await dispatchComic({kind:'forge',inputs:input,token:'private',fetchImpl:x.fetchImpl})).route,'repository_dispatch');
 assert.equal(x.requests.length,2);
 assert.equal(x.requests[1].body.event_type,'sapiver_forge_approved_release');
 assert.deepEqual(x.requests[1].body.client_payload,input);
});
test('Etsy dispatch requires no caller-supplied listing IDs or other uncontrolled payload',async()=>{
 const x=fake(403,204);
 assert.equal((await dispatchComic({kind:'etsy',token:'private',fetchImpl:x.fetchImpl})).route,'repository_dispatch');
 assert.equal(x.requests[0].url.endsWith('sapiverprints-pinterest.yml/dispatches'),true);
 assert.equal(x.requests[1].body.event_type,'sapiver_prints_new_listing');
 await assert.rejects(dispatchComic({kind:'etsy',inputs:{listing:123},token:'private',fetchImpl:x.fetchImpl}),/no untrusted inputs/);
});
test('never dispatch unapproved, malformed or partial release identity',async()=>{
 const x=fake(204);
 for(const inputs of [{...input,confirm:'RETRY'},{...input,candidate_id:''},{...input,source_sha:'main'},{...input,edition_date:'tomorrow'}]){
  await assert.rejects(dispatchComic({kind:'forge',inputs,token:'private',fetchImpl:x.fetchImpl}),/Incomplete/);
 }
 assert.equal(x.requests.length,0);
});
test('missing token or both denied routes fail explicitly without reporting publication',async()=>{
 const x=fake(403,403);
 await assert.rejects(dispatchComic({kind:'forge',inputs:input,token:'',fetchImpl:x.fetchImpl}),/missing/);
 assert.equal(x.requests.length,0);
 await assert.rejects(dispatchComic({kind:'forge',inputs:input,token:'private',fetchImpl:x.fetchImpl}),/permissions unavailable/);
 assert.equal(x.requests.length,2);
});
test('unrelated provider errors never retry potentially accepted dispatch',async()=>{
 const x=fake(500,204);
 await assert.rejects(dispatchComic({kind:'forge',inputs:input,token:'private',fetchImpl:x.fetchImpl}),/HTTP 500/);
 assert.equal(x.requests.length,1);
});
