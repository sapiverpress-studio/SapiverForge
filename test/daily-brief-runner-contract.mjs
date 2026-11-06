import assert from 'node:assert/strict';
import { handler } from '../private-runner/netlify/functions/daily-brief-runner.mjs';

process.env.DAILY_RUNNER_PASSWORD='this-is-a-test-only-password-123';
process.env.DAILY_RUNNER_GITHUB_TOKEN='mock-token';
const host='suite.sapiverpress.co.uk';
const candidate='a'.repeat(64);
const headers=(cookie='',origin='https://'+host)=>({host,origin,cookie});
const req=(action,method='GET',b={},cookie='',params={})=>({
 httpMethod:method,headers:headers(cookie),queryStringParameters:{action,...params},
 body:JSON.stringify(b)
});
let reviewed=false,dispatches=[],campaignStatus='draft';
const item=(data,sha)=>({sha,encoding:'base64',content:Buffer.from(JSON.stringify(data)).toString('base64')});
globalThis.fetch=async(url,options)=>{
 const {pathname}=new URL(url);
 const ok=data=>new Response(JSON.stringify(data),{status:200});
 if(options.method==='POST'&&pathname.includes('/dispatches')){
  dispatches.push(pathname);return new Response(null,{status:204});
 }
 if(pathname.includes('/actions/workflows/')&&pathname.endsWith('/runs'))return ok({workflow_runs:[]});
 if(pathname.endsWith('/manifest.json'))return ok(item({
  candidate_id:candidate,newsletter_ready_for_human_approval:true,quality_status:'ready'
 },'manifest-sha'));
 if(pathname.endsWith('/newsletter-metadata.json'))return ok(item({
  candidate_id:candidate,status:campaignStatus,brevo_campaign_id:456
 },'metadata-sha'));
 if(pathname.endsWith('/runner-review.json')){
  return reviewed?ok(item({date:'2026-11-06',status:'verified',candidate_id:candidate,
   brevo_draft_verified:true,manifest_blob_sha:'manifest-sha',
   newsletter_blob_sha:'metadata-sha',reviewed_at:'2026-11-06T07:00:00Z'},'review-sha')):
   new Response('Missing',{status:404});
 }
 if(pathname.endsWith('/zip-upload-status.json'))return new Response('Missing',{status:404});
 if(pathname.endsWith('/netlify-release.json'))return new Response('Missing',{status:404});
 throw Error('Unmocked request: '+pathname);
};
process.env.DAILY_RUNNER_PASSWORD='ElevenChar!';
assert.equal((await handler(req('login','POST',{password:process.env.DAILY_RUNNER_PASSWORD}))).statusCode,503);
process.env.DAILY_RUNNER_PASSWORD='TwelveChars!';
assert.equal(process.env.DAILY_RUNNER_PASSWORD.length,12);
assert.equal((await handler(req('deploy','POST',{date:'2026-11-06'}))).statusCode,401);
assert.equal((await handler(req('login','POST',{password:'wrong'}))).statusCode,401);
const login=await handler(req('login','POST',{password:process.env.DAILY_RUNNER_PASSWORD}));
assert.equal(login.statusCode,200);
const cookie=login.headers['Set-Cookie'].split(';')[0];
let status=await handler(req('status','GET',{},cookie,{date:'2026-11-06'}));
assert.equal(status.statusCode,200);
assert.equal(JSON.parse(status.body).state.edited,false);
assert.equal((await handler(req('deploy','POST',{date:'2026-11-06'},cookie))).statusCode,409);
assert.equal(dispatches.length,0);
assert.equal((await handler(req('start','POST',{date:'2026-11-06'},cookie))).statusCode,202);
assert.equal(dispatches.length,1);
reviewed=true;
status=await handler(req('status','GET',{},cookie,{date:'2026-11-06'}));
assert.equal(JSON.parse(status.body).state.edited,true);
campaignStatus='brevo_draft';
status=await handler(req('status','GET',{},cookie,{date:'2026-11-06'}));
assert.equal(JSON.parse(status.body).state.edited,true,'Brevo workflow stores status brevo_draft');
assert.equal((await handler(req('deploy','POST',{date:'2026-11-06'},cookie))).statusCode,202);
assert.equal(dispatches.length,2);
const forged={...req('deploy','POST',{date:'2026-11-06'},cookie),
 headers:headers(cookie,'https://evil.example')};
assert.equal((await handler(forged)).statusCode,403);
assert.equal(dispatches.length,2);
console.log('Runner auth, draft verification, dispatch and cross-site safety tests passed');
