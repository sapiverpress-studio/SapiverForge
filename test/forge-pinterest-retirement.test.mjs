import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('Daily Brief deliberately skips retired Forge board, retains Facebook receipt and does not call Pinterest',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sapiver-forge-pinterest-retired-'));
 try{
  const manifest=path.join(tmp,'manifest.json'),receipt=path.join(tmp,'receipt.json');
  fs.writeFileSync(manifest,JSON.stringify({date:'2026-10-20',social:{facebook_post:'Approved publisher test, do not send anywhere'}}));
  const script=path.resolve('scripts/post-daily-brief-social.mjs');
  const fake=`globalThis.fetch=async url=>{
    if(!String(url).startsWith('https://graph.facebook.com/'))throw Error('Unexpected outbound network: '+url);
    return {ok:true,text:async()=>JSON.stringify({id:'fake-facebook-test-receipt'})};
   };await import(process.env.SOCIAL_SCRIPT);`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',fake],{
   encoding:'utf8',cwd:tmp,env:{...process.env,SOCIAL_SCRIPT:script,DAILY_BRIEF_MANIFEST:manifest,
    DISTRIBUTION_RECEIPT_PATH:receipt,FORGE_PINTEREST_DISABLED:'true',
    FB_PAGE_ID:'123456',FB_PAGE_TOKEN:'test-page-token'}
  });
  assert.equal(r.status,0,r.stderr);
  const parsed=JSON.parse(fs.readFileSync(receipt,'utf8'));
  assert.equal(parsed.facebook.id,'fake-facebook-test-receipt');
  assert.equal(parsed.pinterest_disabled,true);
  assert.equal(parsed.pinterest_error,undefined);
  assert.match(r.stdout,/intentionally disabled/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
