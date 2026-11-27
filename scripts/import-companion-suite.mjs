// Exact one-book post-publication import. Uses the already configured Netlify PAT.
// No GitHub cross-repo calls, merchant requests, public files or source-store writes.
import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const SOURCE='d1753fca-2098-4b96-a684-75921df7c3da';
const DEST='47bda30e-4698-4cf5-bcd4-d59785e1f399';
const ID='hb-ac23a99e42eee2c856dda344aa45877a';
const EXPECTED='29335ae3de994c5919a997785d812300f20112bbe285bc38993ee7b06352e491';
const HTML='c26ffc578c0bb7bc5184639b9adb4cfbcee64658e5b6a3deff298b4e38d972df';
const token=process.env.NETLIFY_AUTH_TOKEN;
const hash=b=>createHash('sha256').update(b).digest('hex');
const open=(siteID,name)=>getStore({name,siteID,token,consistency:'strong'});
const tmp=mkdtempSync(join(tmpdir(),'hb-suite-'));
let stage='configuration';
try{
 if(!token||process.env.GITHUB_REPOSITORY!=='sapiverpress-studio/SapiverForge'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Unapproved context');
 stage='source product lookup';
 const src=open(SOURCE,'sapiver-poster-uploads'), matches=[];
 for await(const page of src.list({prefix:'products/',paginate:true})){
  for(const b of page.blobs){
   if(!/^products\/[A-Za-z0-9_-]{32}\/record$/.test(b.key))continue;
   const r=await src.get(b.key,{type:'json'});
   if(Number(r?.etsyListingId)===4626688605)matches.push(r);
  }
 }
 if(matches.length!==1)throw Error('Exact listing record unavailable; matches='+matches.length);
 stage='source archive verification';
 let raw;
 for(const rev of new Set([matches[0].currentRevision,matches[0].pendingRevision].filter(x=>/^[A-Za-z0-9_-]{32}$/.test(x||'')))){
  const state=await src.get('uploads/'+rev+'/state',{type:'json'});
  if(state?.metadata?.kind!=='activity-book'||state.archiveKey!=='uploads/'+rev+'/original.zip')continue;
  const data=await src.get(state.archiveKey,{type:'arrayBuffer'});
  if(data&&hash(Buffer.from(data))===EXPECTED){raw=Buffer.from(data);break;}
 }
 if(!raw)throw Error('Saved archive does not match the reviewed edition');
 console.log('Exact reviewed source archive verified.');
 stage='package companion';
 const file=join(tmp,'source.zip'),out=join(tmp,'book.zip'),extracted=join(tmp,'site');
 writeFileSync(file,raw,{mode:0o600});
 execFileSync('python3',['scripts/package-companion-suite.py',file,out],{stdio:'inherit',timeout:60000});
 execFileSync('python3',['-m','zipfile','-e',out,extracted],{stdio:'pipe',timeout:60000});
 const folder=join(extracted,'activity-books',ID),receipt=JSON.parse(readFileSync(join(folder,'publication.json'),'utf8'));
 const names=['index.html',...Array.from({length:36},(_,i)=>'pages/'+String(i).padStart(2,'0')+'.jpg'),'pages/39.jpg','pages/40.jpg'];
 if(receipt.bookId!==ID||receipt.status!=='pilot'||receipt.url!=='https://suite.sapiverpress.co.uk/activity-books/'+ID+'/'||receipt.interactiveHash!==HTML||Object.keys(receipt.pages).length!==38)throw Error('Invalid receipt');
 const assets=names.map(n=>{const b=readFileSync(join(folder,n));if(hash(b)!==(n==='index.html'?HTML:receipt.pages[n]))throw Error('Asset hash mismatch');return {n,b};});
 const script=assets[0].b.toString('utf8').match(/<script>([\s\S]*?)<\/script>/g);
 if(script?.length!==1)throw Error('Invalid script');
 const scriptHash=createHash('sha256').update(script[0].slice(8,-9)).digest('base64');
 stage='write private companion storage';
 const dst=open(DEST,'hen-bea-companion-books'),prefix='books/'+ID+'/';
 const old=await dst.get(prefix+'receipt',{type:'json'});
 if(old&&(old.bookId!==ID||old.interactiveHash!==HTML||old.status!=='pilot'))throw Error('Existing record is not the same protected pilot');
 for(const {n,b} of assets){
  const key=prefix+n;const prior=await dst.get(key,{type:'arrayBuffer'});
  if(prior){if(hash(Buffer.from(prior))!==hash(b))throw Error('Existing asset differs');}
  else await dst.set(key,b,{onlyIfNew:true});
  const check=await dst.get(key,{type:'arrayBuffer'});
  if(!check||hash(Buffer.from(check))!==hash(b))throw Error('Storage read-back mismatch');
 }
 const record={...receipt,scriptHash,sourceArchiveHash:EXPECTED,previewHash:'139de58c3466ae8b3d7b33c8cd8babd3888a4212807b84aa8e7f57a553c893e9'};
 if(!old)await dst.setJSON(prefix+'receipt',record,{onlyIfNew:true});
 const check=await dst.get(prefix+'receipt',{type:'json'});
 if(!check||JSON.stringify(check)!==JSON.stringify(record))throw Error('Receipt read-back mismatch');
 console.log('SUCCESS: 39 companion assets and protected pilot receipt verified in existing Sapiver site storage. No website deployment or Etsy changes.');
}catch(e){console.error('Companion import stopped at '+stage+': '+(e?.status?('HTTP '+e.status):e?.name==='Error'?String(e.message).replace(/[\r\n]/g,' ').slice(0,150):e?.name||'unknown error'));process.exitCode=1;}
finally{rmSync(tmp,{recursive:true,force:true});}
