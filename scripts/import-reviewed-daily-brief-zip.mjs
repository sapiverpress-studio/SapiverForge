import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const fatal=new TextDecoder('utf-8',{fatal:true});
const maxArchive=40000,maxTotal=1500000,maxFiles=45;
const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});
function crc32(buffer){let c=0xffffffff;for(const v of buffer)c=(c>>>8)^table[(c^v)&255];return (c^0xffffffff)>>>0;}
function safeZipName(n){
 if(!n||n.length>180||n.startsWith('/')||n.includes('\\')||n.includes('\0')||n.includes('//')||n.split('/').includes('..')||n.split('/').includes('.'))throw Error('Unsafe ZIP path');
 if(!/^[a-zA-Z0-9_./-]+$/.test(n))throw Error('ZIP filename contains unsupported characters');
 return n;
}
export function extractZip(zip){
 if(!Buffer.isBuffer(zip)||zip.length<22||zip.length>maxArchive)throw Error('ZIP must be between 22 bytes and 40 KB');
 let end=-1;
 for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)if(zip.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw Error('ZIP central directory missing');
 const count=zip.readUInt16LE(end+10),size=zip.readUInt32LE(end+12),offset=zip.readUInt32LE(end+16);
 if(zip.readUInt16LE(end+4)!==0||zip.readUInt16LE(end+6)!==0||zip.readUInt16LE(end+8)!==count)throw Error('Multi-disk ZIP not supported');
 if(count<1||count>maxFiles||offset+size>end)throw Error('ZIP entry count or central directory invalid');
 let pos=offset,total=0;
 const entries=new Map();
 for(let i=0;i<count;i++){
  if(pos+46>offset+size||zip.readUInt32LE(pos)!==0x02014b50)throw Error('Malformed ZIP entry');
  const flags=zip.readUInt16LE(pos+8),method=zip.readUInt16LE(pos+10),crc=zip.readUInt32LE(pos+16),
   compressed=zip.readUInt32LE(pos+20),uncompressed=zip.readUInt32LE(pos+24),
   len=zip.readUInt16LE(pos+28),extra=zip.readUInt16LE(pos+30),comment=zip.readUInt16LE(pos+32),
   external=zip.readUInt32LE(pos+38),local=zip.readUInt32LE(pos+42);
  const next=pos+46+len+extra+comment;
  if(next>offset+size)throw Error('ZIP entry exceeds directory');
  const filename=safeZipName(fatal.decode(zip.subarray(pos+46,pos+46+len)));
  pos=next;
  if(filename.endsWith('/'))continue;
  if(entries.has(filename)||entries.size>=maxFiles)throw Error('Duplicate or excessive ZIP file');
  if((flags&1)!==0||![0,8].includes(method)||(external>>>16&0o170000)===0o120000)throw Error('Encrypted ZIP or symlink unsupported');
  if(uncompressed>450000||compressed>maxArchive||!compressed&&uncompressed||uncompressed>compressed*150+8192)throw Error('Oversized or suspicious ZIP entry');
  total+=uncompressed;if(total>maxTotal)throw Error('ZIP expands beyond permitted size');
  if(local+30>offset||zip.readUInt32LE(local)!==0x04034b50)throw Error('Invalid local ZIP header');
  const start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
  if(start+compressed>offset)throw Error('ZIP data overlaps directory');
  const packed=zip.subarray(start,start+compressed);
  const data=method===0?packed:zlib.inflateRawSync(packed,{maxOutputLength:Math.min(450001,uncompressed+1)});
  if(data.length!==uncompressed||crc32(data)!==crc)throw Error('ZIP size or checksum mismatch');
  entries.set(filename,fatal.decode(data));
 }
 if(pos!==offset+size||!entries.size)throw Error('Invalid ZIP directory length');
 return entries;
}
const suffixes=['daily-brief.md','newsletter.md','newsletter.html','social.json','sources.json','manifest.json','newsletter-metadata.json','human-review.html'];
const dailySuffixes=['COPY_PASTE_INTO_ELEVENLABS.txt','short-script.txt','podcast-script.md','episode-metadata.json','source-notes.md','candidate-manifest.json'];
const weeklySuffixes=['COPY_PASTE_INTO_ELEVENLABS.txt','short-script.txt','podcast-script.md','episode-metadata.json','source-notes.md','candidate-manifest.json','weekly-article.html'];
const asJson=(entries,k)=>{try{return JSON.parse(entries.get(k));}catch{throw Error('Invalid JSON: '+k);}};
const digest=buffer=>sha(Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer));
function verifyCandidate(entries,date) {
 const prefix='news-intelligence/'+date+'/',daily='reports/daily-intelligence/'+date+'/',weekly='reports/weekly-intelligence/'+date+'/';
 const allowed=new Set([...suffixes.map(n=>prefix+n),prefix+'verification-evidence.json',...dailySuffixes.map(n=>daily+n),...weeklySuffixes.map(n=>weekly+n)]);
 for(const name of entries.keys())if(!allowed.has(name))throw Error('Unexpected release package file: '+name);
 for(const n of suffixes)if(!entries.has(prefix+n))throw Error('Missing publication file: '+n);
 for(const n of dailySuffixes)if(!entries.has(daily+n))throw Error('Missing detailed-story file: '+n);
 if(!entries.has(prefix+'verification-evidence.json'))throw Error('Missing source verification evidence');
 const manifest=asJson(entries,prefix+'manifest.json'),meta=asJson(entries,prefix+'newsletter-metadata.json');
 if(manifest.date!==date||meta.date!==date||manifest.type!=='sapiver_forge_news_intelligence'||manifest.schema_version!==1)throw Error('Edition identity mismatch');
 const {candidate_id,...core}=manifest;
 if(!/^[a-f0-9]{64}$/.test(candidate_id||'')||sha(JSON.stringify(core))!==candidate_id)throw Error('Manifest identity/hash does not match contents');
 if(manifest.newsletter_ready_for_human_approval!==true||!['ready','ready_with_warnings'].includes(manifest.quality_status)||
   manifest.approved_for_automatic_distribution!==false||manifest.human_approval_required!==true||
   Number(manifest.overall_confidence||0)<0.78||!Array.isArray(manifest.release_blockers)||manifest.release_blockers.length>0||
   !Array.isArray(manifest.stories)||manifest.stories.length<3)throw Error('Incomplete or blocked manifest');
 if(meta.candidate_id!==candidate_id||meta.approved!==false||meta.sent_at||meta.brevo_campaign_id||
   meta.status!=='ready_for_human_approval')throw Error('Metadata must be an unsent, unapproved draft candidate');
 if(!Array.isArray(manifest.source_set)||manifest.source_set.length!==5)throw Error('Source discovery set incomplete');
 for(const story of manifest.stories){
  if(!/^https:\/\//.test(story.url)||Number(story.confidence)<0.72||!story.confirmed_fact||!story.interpretation||!story.why_it_matters)throw Error('Incomplete source-checked story');
  if(!entries.get(prefix+'newsletter.md').includes(story.url)||!entries.get(prefix+'newsletter.html').includes(story.url))throw Error('Story missing from email or Markdown');
 }
 const html=entries.get(prefix+'newsletter.html');
 if(!html.includes('<main')||!html.includes('{{ unsubscribe }}')||/not publication ready|No Sapiver Forge interpretation generated|prepayment credits are depleted/i.test(html))throw Error('Newsletter is a preview/placeholder rather than publish-ready');
 const evidence=asJson(entries,prefix+'verification-evidence.json');
 if(evidence.date!==date||!Array.isArray(evidence.sources)||evidence.sources.length<3)throw Error('Source verification evidence incomplete');
 const media=asJson(entries,daily+'candidate-manifest.json'),episode=asJson(entries,daily+'episode-metadata.json');
 if(media.type!=='sapiver_forge_daily_detailed_story'||media.date!==date||media.newsletter_candidate_id!==candidate_id||
    episode.date!==date||episode.selected_story?.source_url!==manifest.stories[0].url)throw Error('Detailed story is not for this edition and lead');
 const hashEntries=Object.entries(media.file_hashes||{});
 if(hashEntries.length!==5)throw Error('Detailed story media seal incomplete');
 for(const [n,v] of hashEntries){
  if(!dailySuffixes.includes(n)||n==='candidate-manifest.json'||digest(entries.get(daily+n)||'')!==v)throw Error('Detailed story media hash mismatch: '+n);
 }
 if(sha(JSON.stringify({metadata:episode,hashes:media.file_hashes}))!==media.candidate_id)throw Error('Detailed story identity mismatch');
 const weeklyFound=[...entries.keys()].filter(n=>n.startsWith(weekly));
 if(weeklyFound.length)throw Error('Friday weekly podcast requires separate reviewed package; excluded from this initial uploader');
 return {candidate_id};
}
function saveText(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
export function stage(zip,date,{root=process.cwd(),write=true}={}){
 if(!validDate(date))throw Error('Date invalid');
 const entries=extractZip(zip),fingerprint=sha(zip);
 const reviewNames=['README.txt','corrected-daily-brief.md','corrected-newsletter-preview.html','social-copy-review.txt','verification-report.json'];
 const isReview=entries.has('verification-report.json')&&!entries.has('news-intelligence/'+date+'/manifest.json');
 if(isReview){
  if([...entries.keys()].some(n=>!reviewNames.includes(n))||
     !entries.has('corrected-daily-brief.md')||!entries.has('corrected-newsletter-preview.html'))throw Error('Unexpected or incomplete review-only ZIP');
  const report=asJson(entries,'verification-report.json');
  if(report.date!==date||report.brevo_draft_verified===true||report.editorial_status!=='source_checked_draft_not_publication_ready')throw Error('Review status does not match this edition');
  if(write){
   const dir=path.join(root,'news-intelligence',date,'reviewed-upload',fingerprint.slice(0,16));
   for(const [n,v] of entries)saveText(path.join(dir,n),v);
   saveText(path.join(root,'news-intelligence',date,'zip-upload-status.json'),JSON.stringify({
    date,sha256:fingerprint,kind:'review_only',status:'stored_for_editorial_review',ready_to_publish:false,
    message:'Review-only ZIP stored. Full verified release package, Brevo draft and media still required.'
   },null,2)+'\n');
  }
  return {kind:'review_only',fingerprint,files:entries.size};
 }
 const {candidate_id}=verifyCandidate(entries,date);
 if(write){
  const dst=path.join(root,'news-intelligence',date);
  if(fs.existsSync(path.join(dst,'netlify-release.json'))||fs.existsSync(path.join(dst,'site-release.json')))throw Error('Edition already published; refusing overwrite');
  if(fs.existsSync(path.join(dst,'newsletter-metadata.json'))){
   const old=JSON.parse(fs.readFileSync(path.join(dst,'newsletter-metadata.json'),'utf8'));
   if(old.status==='sent'||old.sent_at||old.approved)throw Error('Already-sent edition cannot be overwritten');
  }
  for(const [n,v] of entries)saveText(path.join(root,n),v);
  saveText(path.join(dst,'zip-upload-status.json'),JSON.stringify({
   date,sha256:fingerprint,kind:'publication_candidate',status:'awaiting_brevo_draft_verification',
   candidate_id,ready_to_publish:false,message:'Publication files imported; preparing and verifying unsent Brevo draft.'
  },null,2)+'\n');
 }
 return {kind:'publication_candidate',fingerprint,candidate_id,files:entries.size};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
 const date=String(process.env.EDITION_DATE||''),base64=String(process.env.UPLOAD_B64||'');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw Error('Invalid encoded ZIP');
 const zip=Buffer.from(base64,'base64');
 if(zip.toString('base64')!==base64||sha(zip)!==process.env.UPLOAD_SHA256)throw Error('Uploaded ZIP fingerprint mismatch');
 const result=stage(zip,date);
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'kind='+result.kind+'\n');
 console.log('Reviewed ZIP imported: '+result.kind+' '+result.fingerprint.slice(0,12)+' ('+result.files+' files)');
 if(result.kind==='review_only')console.log('NO BREVO DRAFT, NO PUBLICATION: review-only ZIP lacks release deliverables.');
}
