import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const date='2026-11-03';
const root=process.cwd();
const dir=path.join(root,'news-intelligence',date);
const bridge=path.join(root,'bridge/news-intelligence/latest');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const sha=value=>createHash('sha256').update(value).digest('hex');
const normal=value=>String(value??'').replace(/\r\n/g,'\n').trim();
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const assert=(value,message)=>{if(!value)throw Error(message);};

const marker=read('editorial-review-ready.json');
const manifest=read('manifest.json');
let meta=read('newsletter-metadata.json');
assert(marker.date===date&&marker.editorial_revision==='2026-11-03-reviewed-1','Unexpected reviewed edition.');
assert(marker.ready_for_draft_preparation===true&&marker.send===false&&marker.deploy===false&&marker.human_release_required===true,'This marker must authorise draft preparation only.');
assert(manifest.editorial_revision===marker.editorial_revision&&manifest.newsletter_ready_for_human_approval===true&&!manifest.release_blockers.length,'Edition remains blocked or unreviewed.');
assert(manifest.stories.length===3&&manifest.overall_confidence>=0.78,'Reviewed story contract failed.');
assert(manifest.candidate_id===marker.candidate_id&&meta.candidate_id===marker.candidate_id,'Candidate IDs do not match.');
const {candidate_id,...core}=manifest;
assert(sha(JSON.stringify(core))===candidate_id,'Manifest seal mismatch.');
assert(!meta.approved&&!meta.sent_at&&['ready_for_human_approval','brevo_draft'].includes(meta.status),'Refusing to alter a sent, approved or unexpected edition.');
assert(Object.keys(marker.file_hashes||{}).length===14,'Expected the complete reviewed publication seal.');
for(const [name,expected] of Object.entries(marker.file_hashes)){
 assert(!name.includes('..')&&(/^(news-intelligence|reports\/daily-intelligence)\/2026-11-03\//).test(name),'Unsafe seal path.');
 assert(sha(fs.readFileSync(path.join(root,name)))===expected,'Reviewed file changed: '+name);
}
const html=fs.readFileSync(path.join(dir,'newsletter.html'),'utf8');
const md=fs.readFileSync(path.join(dir,'newsletter.md'),'utf8');
for(const story of manifest.stories){
 assert(html.includes(esc(story.headline))&&md.includes(story.headline),'Reviewed headline is missing.');
 assert(html.includes(story.url)&&md.includes(story.url),'Original source link is missing.');
}
for(const phrase of ['50 evaluation passes','Gemma 3 270M','existing organisation','planning an internal security sprint']){
 assert(html.includes(phrase)&&md.includes(phrase),'A material reviewed qualification is missing: '+phrase);
}
assert(html.includes('{{ unsubscribe }}')&&html.includes('/learn/lessons/day-034/')&&html.includes('/parents/projects/day-063/'),'Newsletter extras or unsubscribe link missing.');
assert(!/prepayment credits are depleted|No Sapiver Forge interpretation generated|source index only/i.test(html+md),'Blocked placeholder copy remains.');
const evidence=read('verification-evidence.json');
assert(evidence.method==='direct_source_review'&&evidence.recovery.billing_resolved===false,'Source review or outstanding billing issue is not recorded.');
const mediaDir=path.join(root,'reports/daily-intelligence',date);
const mediaSeal=JSON.parse(fs.readFileSync(path.join(mediaDir,'candidate-manifest.json'),'utf8'));
const mediaMeta=JSON.parse(fs.readFileSync(path.join(mediaDir,'episode-metadata.json'),'utf8'));
assert(mediaSeal.type==='sapiver_forge_daily_detailed_story'&&mediaSeal.date===date&&mediaSeal.newsletter_candidate_id===candidate_id,'Detailed story belongs to another edition.');
assert(mediaMeta.selected_story.source_url===manifest.stories[0].url,'Detailed story and newsletter lead differ.');
assert(Object.keys(mediaSeal.file_hashes||{}).length===5,'Detailed-story seal is incomplete.');
for(const [name,expected] of Object.entries(mediaSeal.file_hashes))assert(sha(fs.readFileSync(path.join(mediaDir,name)))===expected,'Detailed-story hash mismatch: '+name);
assert(sha(JSON.stringify({metadata:mediaMeta,hashes:mediaSeal.file_hashes}))===mediaSeal.candidate_id,'Detailed-story candidate ID mismatch.');
console.log('Reviewed newsletter, source evidence, 14 file hashes and complete detailed story verified.');
if(process.argv.includes('--check-only'))process.exit(0);

assert(process.env.BREVO_API_KEY,'Missing BREVO_API_KEY.');
const headers={'api-key':process.env.BREVO_API_KEY,accept:'application/json'};
const api=async suffix=>{
 const response=await fetch('https://api.brevo.com/v3/emailCampaigns'+suffix,{headers});
 assert(response.ok,'Brevo read failed: HTTP '+response.status);
 return response.json();
};
const campaignName='Sapiver Forge Daily Brief '+date;
if(!meta.brevo_campaign_id){
 const recent=await api('?type=classic&limit=100&offset=0&sort=desc');
 const matching=(recent.campaigns||[]).filter(c=>c.name===campaignName);
 assert(!matching.some(c=>c.status!=='draft'),'A non-draft campaign already exists for this edition; preserve it and review separately.');
 assert(matching.length<=1,'Multiple matching Brevo drafts exist; no campaign was modified.');
 if(matching.length){
  meta.brevo_campaign_id=matching[0].id;
  write(path.join(dir,'newsletter-metadata.json'),meta);
  console.log('Reusing existing Brevo draft '+meta.brevo_campaign_id+'.');
 }
}
if(meta.brevo_campaign_id){
 const existing=await api('/'+meta.brevo_campaign_id);
 assert(existing.status==='draft'&&existing.name===campaignName,'Existing campaign is not the expected unsent draft.');
}
const child=spawnSync(process.execPath,['src/send-daily-newsletter-brevo.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,NEWS_INTELLIGENCE_DATE:date,BREVO_SEND_MODE:'draft',NEWSLETTER_APPROVED:'false',BREVO_CORRECTION_MODE:'false'}});
assert(!child.error&&child.status===0,'Brevo draft preparation failed.');
meta=read('newsletter-metadata.json');
assert(meta.status==='brevo_draft'&&Number.isInteger(meta.brevo_campaign_id)&&!meta.sent_at,'An unsent Brevo draft was not created.');
const remote=await api('/'+meta.brevo_campaign_id);
assert(remote.status==='draft'&&remote.subject===meta.subject,'Brevo status or subject does not match.');
assert(normal(remote.htmlContent)===normal(html),'Brevo HTML differs from the reviewed repository newsletter.');
const verifiedAt=new Date().toISOString();
Object.assign(meta,{approved:false,pending_human_release:true,campaign_status:'draft_verified',verified_at:verifiedAt,html_sha256:sha(html),normalised_html_sha256:sha(normal(html)),brevo_normalised_html_sha256:sha(normal(remote.htmlContent))});
write(path.join(dir,'newsletter-metadata.json'),meta);
write(path.join(dir,'draft-verification.json'),{date,candidate_id,status:'verified_unsent_draft',brevo_campaign_id:meta.brevo_campaign_id,verified_at:verifiedAt,html_sha256:meta.html_sha256,normalised_html_sha256:meta.normalised_html_sha256,brevo_normalised_html_sha256:meta.brevo_normalised_html_sha256,email_sent:false,deployed:false});
const bridgeNames=['manifest.json','daily-brief.md','newsletter.html','newsletter-metadata.json','social.json','sources.json','human-review.html'];
fs.mkdirSync(bridge,{recursive:true});
for(const name of bridgeNames)fs.copyFileSync(path.join(dir,name),path.join(bridge,name));
write(path.join(bridge,'file-hashes.json'),Object.fromEntries(bridgeNames.map(name=>[name,sha(fs.readFileSync(path.join(bridge,name)))])));
console.log('Verified identical repository/Brevo HTML for unsent draft '+meta.brevo_campaign_id+'. NO EMAIL SENT. NO DEPLOYMENT.');
