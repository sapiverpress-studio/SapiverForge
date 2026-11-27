// One-way sync of exact owner-approved and Etsy-published source revisions.
// The existing public read route serves site-wide storage; never deploy a site per book.
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const HASH=/^[a-f0-9]{64}$/, REV=/^[A-Za-z0-9_-]{32}$/;
const ORIGIN='https://suite.sapiverpress.co.uk';
const SHA=v=>createHash('sha256').update(v).digest('hex');
const PAGES=[...Array.from({length:36},(_,i)=>'pages/'+String(i).padStart(2,'0')+'.jpg'),'pages/39.jpg','pages/40.jpg'];
const GET={type:'json',consistency:'strong'}, BIN={type:'arrayBuffer',consistency:'strong'};
const exact=(a,b)=>a&&b&&['bookId','manifestHash','interiorHash','interactiveHash','url','scriptHash'].every(k=>a[k]===b[k])&&Object.keys(a.pages||{}).length===PAGES.length&&PAGES.every(k=>a.pages[k]===b.pages[k]);
export function authorisedRevision({revision,request,claim,state,product,revisionRecord}){
 if(!REV.test(revision)||request?.revision!==revision||!HASH.test(request.approvalHash||'')||!HASH.test(request.sourceHash||'')||claim?.publicCompanionApproved!==true||claim.approvalHash!==request.approvalHash||!Number.isFinite(claim.at))return false;
 return state?.phase==='published'&&state.type==='digital'&&state.metadata?.kind==='activity-book'&&state.sourceKind==='activity-book'&&state.approvalHash===request.approvalHash&&state.plan?.sourceHash===request.sourceHash&&SHA(JSON.stringify(state.plan))===request.approvalHash&&state.sourceHash===request.sourceHash&&state.archiveKey==='uploads/'+revision+'/original.zip'&&Number.isSafeInteger(state.listingId)&&state.listingId>0&&Number.isFinite(state.publishedAt)&&product?.etsyListingId===state.listingId&&revisionRecord?.id===revision&&revisionRecord.phase==='published'&&revisionRecord.listingId===state.listingId;
}
export function stageArchive(raw,expected){
 const temp=mkdtempSync(join(tmpdir(),'sapiver-companion-'));
 try{
  const source=join(temp,'source.zip'),out=join(temp,'out');writeFileSync(source,raw,{mode:0o600});
  execFileSync('python3',[fileURLToPath(new URL('./package-approved-companion.py',import.meta.url)),source,expected,out],{stdio:'pipe',timeout:60000});
  const receipt=JSON.parse(readFileSync(join(out,'receipt.json'),'utf8'));
  const assets=Object.fromEntries(['index.html',...PAGES].map(n=>[n,readFileSync(join(out,n))]));
  return {receipt,assets};
 }finally{rmSync(temp,{recursive:true,force:true});}
}
export async function publishExact({dest,receipt,assets,approvedAt}){
 const id=receipt.bookId;
 if(!HASH.test(receipt.manifestHash||'')||!HASH.test(receipt.interiorHash||'')||id!=='hb-'+SHA('sapiver-book-v1\n'+receipt.manifestHash+'\n'+receipt.interiorHash).slice(0,32)||receipt.url!==ORIGIN+'/activity-books/'+id+'/'||!HASH.test(receipt.sourceArchiveHash||'')||!Number.isFinite(approvedAt)||Object.keys(assets).length!==39||Object.keys(receipt.pages||{}).length!==38||!(/^[A-Za-z0-9+/]{43}=$/.test(receipt.scriptHash||'')))throw Error('Invalid publication identity');
 const names=['index.html',...PAGES];
 for(const n of names){const b=assets[n],hash=n==='index.html'?receipt.interactiveHash:receipt.pages[n];if(!Buffer.isBuffer(b)||!HASH.test(hash||'')||SHA(b)!==hash)throw Error('Asset hash mismatch');}
 const prefix='books/'+id+'/',key=prefix+'receipt';
 const prior=await dest.getWithMetadata(key,GET);
 if(prior&&(!exact(prior.data,receipt)||!['pilot','published'].includes(prior.data.status)))throw Error('Existing companion differs; never overwrite');
 // Write immutable assets and read them back before making the record public.
 for(const n of names){const b=assets[n],k=prefix+n;const old=await dest.get(k,BIN);if(old===null)await dest.set(k,b,{onlyIfNew:true});else if(SHA(Buffer.from(old))!==SHA(b))throw Error('Existing asset differs');const actual=await dest.get(k,BIN);if(actual===null||SHA(Buffer.from(actual))!==SHA(b))throw Error('Storage read-back mismatch');}
 if(prior?.data.status==='published'&&typeof prior.data.publicApprovedAt==='string'&&Number.isFinite(Date.parse(prior.data.publicApprovedAt)))return prior.data;
 const record={...receipt,status:'published',publicApprovedAt:new Date(approvedAt).toISOString()};
 await dest.setJSON(key,record,prior?{onlyIfMatch:prior.etag}:{onlyIfNew:true});
 const readback=await dest.get(key,GET);
 if(!exact(readback,receipt)||readback.status!=='published'||!Number.isFinite(Date.parse(readback.publicApprovedAt)))throw Error('Receipt read-back mismatch');
 return readback;
}
export async function verifyPublic(receipt,request=fetch){
 const url=receipt.url;
 const get=async (part,mime,max)=>{const r=await request(url+part,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});if(r.status!==200||String(r.headers.get('content-type')||'').split(';')[0]!==mime)throw Error('Public companion unavailable');const chunks=[];let size=0;for await(const chunk of r.body||[]){size+=chunk.byteLength;if(size>max)throw Error('Public response too large');chunks.push(Buffer.from(chunk));}return Buffer.concat(chunks);};
 const pub=JSON.parse((await get('publication.json','application/json',100_000)).toString('utf8'));
 if(pub.status!=='published'||['bookId','manifestHash','interiorHash','interactiveHash','url'].some(k=>pub[k]!==receipt[k])||Object.keys(pub.pages||{}).length!==38||PAGES.some(k=>pub.pages[k]!==receipt.pages[k]))throw Error('Public receipt mismatch');
 if(SHA(await get('','text/html',2_000_000))!==receipt.interactiveHash)throw Error('Public HTML mismatch');
 for(let i=0;i<PAGES.length;i+=4)await Promise.all(PAGES.slice(i,i+4).map(async n=>{if(SHA(await get(n,'image/jpeg',5_000_000))!==receipt.pages[n])throw Error('Public page mismatch');}));
 return url;
}
export async function syncOne({source,dest,revision,packageArchive=stageArchive,verify=verifyPublic}){
 if(!REV.test(revision))throw Error('Invalid revision');
 const reqKey='companion-requests/'+revision,request=await source.get(reqKey,GET);
 if(!request)return {phase:'not_requested'};
 const doneKey='companion-sync/'+revision,done=await dest.get(doneKey,GET);
 if(done?.phase==='verified'&&done.sourceHash===request.sourceHash&&done.approvalHash===request.approvalHash)return {phase:'already_verified',url:done.url};
 const claim=await source.get('claims/'+revision+'/publish',GET),state=await source.get('uploads/'+revision+'/state',GET);
 if(!state||!REV.test(state.productId||revision))return {phase:'pending'};
 const product=await source.get('products/'+(state.productId||revision)+'/record',GET);
 const revisionRecord=await source.get('products/'+(state.productId||revision)+'/revisions/'+revision,GET);
 if(!authorisedRevision({revision,request,claim,state,product,revisionRecord}))return {phase:'pending_or_unapproved'};
 const raw=await source.get(state.archiveKey,BIN);
 if(!raw||SHA(Buffer.from(raw))!==request.sourceHash)throw Error('Original archive differs from approval');
 const {receipt,assets}=packageArchive(Buffer.from(raw),request.sourceHash);
 const publicRecord=await publishExact({dest,receipt,assets,approvedAt:claim.at});
 const url=await verify(publicRecord);
 await dest.setJSON(doneKey,{phase:'verified',sourceHash:request.sourceHash,approvalHash:request.approvalHash,url,verifiedAt:new Date().toISOString()},{onlyIfNew:true});
 return {phase:'verified',url};
}
async function main(){
 if(process.env.GITHUB_REPOSITORY!=='sapiverpress-studio/SapiverForge'||process.env.GITHUB_REF!=='refs/heads/main'||!process.env.NETLIFY_AUTH_TOKEN)throw Error('Unapproved workflow context');
 const {getStore}=await import('@netlify/blobs'),token=process.env.NETLIFY_AUTH_TOKEN;
 const source=getStore({name:'sapiver-poster-uploads',siteID:'d1753fca-2098-4b96-a684-75921df7c3da',token,consistency:'strong'}),dest=getStore({name:'hen-bea-companion-books',siteID:'47bda30e-4698-4cf5-bcd4-d59785e1f399',token,consistency:'strong'});
 const revisions=[]; const requested=process.env.COMPANION_REVISION||'';
 if(requested){if(!REV.test(requested))throw Error('Invalid revision');revisions.push(requested);}
 else for await(const page of source.list({prefix:'companion-requests/',paginate:true}))for(const b of page.blobs){const id=b.key.slice('companion-requests/'.length);if(REV.test(id))revisions.push(id);}
 let failures=0;for(const revision of revisions){try{const result=await syncOne({source,dest,revision});console.log('Companion sync: '+result.phase+(result.url?' '+result.url:''));}catch{failures++;console.error('Companion sync failed for one approved revision; no merchant retry.');}}
 if(failures)process.exitCode=1;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main().catch(()=>{console.error('Companion sync stopped. Check workflow configuration.');process.exitCode=1;});
