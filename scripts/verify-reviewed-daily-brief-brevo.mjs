import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gitBlobSha } from './git-blob-sha.mjs';

const date=String(process.env.EDITION_DATE||'');
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Edition date missing');
const dir=path.join(process.cwd(),'news-intelligence',date);
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const write=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const manifest=read('manifest.json'),meta=read('newsletter-metadata.json');
const html=fs.readFileSync(path.join(dir,'newsletter.html'),'utf8');
if(manifest.newsletter_ready_for_human_approval!==true||manifest.quality_status==='blocked')throw Error('Manifest not approved-quality');
if(meta.candidate_id!==manifest.candidate_id||meta.status!=='brevo_draft'||!Number.isInteger(Number(meta.brevo_campaign_id))||meta.sent_at||meta.approved)throw Error('Brevo metadata is not an unsent draft');
if(!process.env.BREVO_API_KEY)throw Error('BREVO_API_KEY missing');
const r=await fetch('https://api.brevo.com/v3/emailCampaigns/'+encodeURIComponent(meta.brevo_campaign_id),{
 headers:{'api-key':process.env.BREVO_API_KEY,accept:'application/json'},signal:AbortSignal.timeout(18000)
});
if(!r.ok)throw Error('Brevo draft readback failed HTTP '+r.status);
const remote=await r.json();
const norm=s=>String(s||'').replace(/\r\n/g,'\n').trim();
if(remote.status!=='draft'||remote.subject!==meta.subject||norm(remote.htmlContent)!==norm(html))throw Error('Brevo draft HTML/subject/status does not exactly match uploaded newsletter');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=file=>gitBlobSha(fs.readFileSync(file));
const review={
 date,status:'verified',candidate_id:manifest.candidate_id,brevo_draft_verified:true,
 manifest_blob_sha:blob(path.join(dir,'manifest.json')),
 newsletter_blob_sha:blob(path.join(dir,'newsletter-metadata.json')),
 reviewed_at:new Date().toISOString(),
 imported_from_zip:true,
 brevo_campaign_id:Number(meta.brevo_campaign_id),
 newsletter_sha256:sha(html)
};
write(path.join(dir,'runner-review.json'),review);
const status=read('zip-upload-status.json');
status.status='brevo_draft_verified';
status.ready_to_publish=true;
status.message='Verified publication files and identical unsent Brevo draft; awaiting manual Deploy approved.';
status.verified_at=review.reviewed_at;
write(path.join(dir,'zip-upload-status.json'),status);
const bridge=path.join(process.cwd(),'bridge/news-intelligence/latest');
fs.mkdirSync(bridge,{recursive:true});
const names=['manifest.json','daily-brief.md','newsletter.html','newsletter-metadata.json','social.json','sources.json','human-review.html'];
for(const n of names)fs.copyFileSync(path.join(dir,n),path.join(bridge,n));
write(path.join(bridge,'file-hashes.json'),Object.fromEntries(names.map(n=>[n,sha(fs.readFileSync(path.join(bridge,n)))])));
console.log('Verified exact unsent Brevo HTML + repository review receipt for '+date+'; NO SEND OR DEPLOY.');
