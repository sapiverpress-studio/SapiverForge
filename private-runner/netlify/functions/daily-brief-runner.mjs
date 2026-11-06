import crypto from 'node:crypto';

const repo='sapiverpress-studio/SapiverForge';
const root='https://api.github.com/repos/'+repo;
const generation='daily-news-intelligence.yml';
const publishing='release-daily-newsletter.yml';
const name='sapiver_daily_runner';
const json=(statusCode,data,headers={})=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...headers},body:JSON.stringify(data)});
const password=()=>String(process.env.DAILY_RUNNER_PASSWORD||'');
const token=()=>String(process.env.DAILY_RUNNER_GITHUB_TOKEN||'');
const equal=(a,b)=>crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(),crypto.createHash('sha256').update(String(b)).digest());
const signature=v=>crypto.createHmac('sha256','sapiver-runner:'+password()).update(v).digest('hex');
const dateToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
function originOK(e){const h=e.headers||{};return !!(h.origin&&h.host&&h.origin==='https://'+h.host);}
function body(e){if(!e.body||e.body.length>4096)return {};try{return JSON.parse(e.body);}catch{return {};}}
function authorised(e){
 if(password().length<12)return false;
 const header=String(e.headers?.cookie||'');
 const m=header.match(/(?:^|;\s*)sapiver_daily_runner=([^;]+)/);
 if(!m)return false;
 const p=decodeURIComponent(m[1]).split('.');
 if(p.length!==3||!/^\d{13}$/.test(p[0])||!/^[a-f0-9]{32}$/.test(p[1])||!/^[a-f0-9]{64}$/.test(p[2]))return false;
 const expiry=Number(p[0]);if(expiry<Date.now()||expiry>Date.now()+43200000)return false;
 return equal(p[2],signature(p[0]+'.'+p[1]));
}
async function gh(path,method='GET',payload,raw=false,notFound=false){
 if(!token())throw Error('GitHub token not configured');
 const res=await fetch(root+path,{method,headers:{Authorization:'Bearer '+token(),Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),redirect:raw?'manual':'follow',signal:AbortSignal.timeout(16000)});
 if(raw)return res;
 if(notFound&&res.status===404)return null;
 if(!res.ok)throw Error('GitHub returned HTTP '+res.status);
 return res.status===204?null:res.json();
}
async function file(path){
 const r=await gh('/contents/'+path+'?ref=main','GET',null,false,true);
 if(!r)return null;
 return {sha:r.sha,data:JSON.parse(Buffer.from(r.content.replace(/\s/g,''),'base64').toString('utf8'))};
}
async function edition(date){
 const p='news-intelligence/'+date+'/';
 const [manifest,meta,review,receipt]=await Promise.all([file(p+'manifest.json'),file(p+'newsletter-metadata.json'),file(p+'runner-review.json'),file(p+'netlify-release.json')]);
 const candidate=String(manifest?.data?.candidate_id||'');
 const ready=!!(candidate&&manifest.data.newsletter_ready_for_human_approval===true&&meta?.data?.candidate_id===candidate&&['brevo_draft','draft'].includes(meta.data.status)&&meta.data.brevo_campaign_id);
 const edited=!!(ready&&review?.data?.date===date&&review.data.status==='verified'&&review.data.candidate_id===candidate&&review.data.brevo_draft_verified===true&&review.data.manifest_blob_sha===manifest.sha&&review.data.newsletter_blob_sha===meta.sha&&review.data.reviewed_at);
 const deployed=!!(receipt?.data?.status==='deployed'&&receipt.data.candidate_id===candidate);
 const sent=!!(meta?.data?.status==='sent'&&meta.data.sent_at);
 const blocked=!!(manifest?.data?.quality_status==='blocked'||meta?.data?.status==='blocked');
 return {date,edited,ready,deployed,sent,blocked,message:edited?'Daily brief edited — repository and email draft verified':deployed&&sent?'Already released':blocked?'Brief blocked; corrections required':ready?'Awaiting verified corrections':'Awaiting an approved-quality draft'};
}
async function run(workflow,since){
 const t=Date.parse(since||'');if(!Number.isFinite(t))return null;
 const result=await gh('/actions/workflows/'+workflow+'/runs?event=workflow_dispatch&branch=main&per_page=20');
 const runs=(result.workflow_runs||[]).filter(r=>Date.parse(r.created_at)>=t-10000);
 runs.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
 const r=runs[0];return r?{id:r.id,number:r.run_number,status:r.status,conclusion:r.conclusion,url:r.html_url}:null;
}
async function artifact(r,date){
 if(!r||r.status!=='completed'||r.conclusion!=='success')return null;
 const result=await gh('/actions/runs/'+r.id+'/artifacts?per_page=50');
 const match=(result.artifacts||[]).find(a=>a.name.startsWith('sapiver-forge-daily-intelligence-'+date+'-')&&!a.expired&&a.size_in_bytes>0);
 return match?{id:match.id,name:match.name,size:match.size_in_bytes}:null;
}
export const handler=async event=>{
 const action=String(event.queryStringParameters?.action||'');
 const method=String(event.httpMethod||'GET');
 try{
  if(action==='login'&&method==='POST'){
   if(!originOK(event))return json(403,{error:'Invalid request origin'});
   if(password().length<12)return json(503,{error:'Password setup required'});
   const pass=body(event).password;
   if(typeof pass!=='string'||!equal(pass,password())){
    await new Promise(resolve=>setTimeout(resolve,650));
    return json(401,{error:'Incorrect password'});
   }
   const payload=String(Date.now()+43200000)+'.'+crypto.randomBytes(16).toString('hex');
   return json(200,{ok:true},{'Set-Cookie':name+'='+payload+'.'+signature(payload)+'; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'});
  }
  if(action==='logout'&&method==='POST'){
   if(!originOK(event))return json(403,{error:'Invalid request origin'});
   return json(200,{ok:true},{'Set-Cookie':name+'=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
  }
  if(!authorised(event))return json(401,{error:'Sign in required'});
  if(!token())return json(503,{error:'GitHub token setup required'});
  const b=method==='POST'?body(event):{};
  const date=String((method==='POST'?b.date:event.queryStringParameters?.date)||dateToday());
  if(!validDate(date))return json(400,{error:'Invalid edition date'});
  if(method==='POST'&&!originOK(event))return json(403,{error:'Invalid request origin'});
  if(action==='start'&&method==='POST'){
   const since=new Date().toISOString();
   await gh('/actions/workflows/'+generation+'/dispatches','POST',{ref:'main',inputs:{edition_date:date}});
   return json(202,{date,since});
  }
  if(action==='status'&&method==='GET'){
   const since=String(event.queryStringParameters?.since||'');
   const releaseSince=String(event.queryStringParameters?.release_since||'');
   const [state,daily,release]=await Promise.all([edition(date),run(generation,since),run(publishing,releaseSince)]);
   return json(200,{date,state,daily,release,artifact:await artifact(daily,date)});
  }
  if(action==='download'&&method==='GET'){
   const daily=await run(generation,String(event.queryStringParameters?.since||''));
   const zip=await artifact(daily,date);
   if(!zip)return json(409,{error:'Review ZIP not ready'});
   const res=await gh('/actions/artifacts/'+zip.id+'/zip','GET',null,true);
   const location=res.headers.get('location');
   if(res.status!==302||!location?.startsWith('https://'))return json(502,{error:'Artifact download failed'});
   return {statusCode:302,headers:{Location:location,'Cache-Control':'no-store'},body:''};
  }
  if(action==='deploy'&&method==='POST'){
   const state=await edition(date);
   if(!state.edited)return json(409,{error:'Repository and Brevo draft not yet verified'});
   const existing=await gh('/actions/workflows/'+publishing+'/runs?event=workflow_dispatch&branch=main&per_page=12');
   if((existing.workflow_runs||[]).some(r=>['queued','in_progress','waiting','pending'].includes(r.status)))
     return json(409,{error:'A release is already running'});
   const since=new Date().toISOString();
   await gh('/actions/workflows/'+publishing+'/dispatches','POST',{ref:'main',inputs:{edition_date:date,confirm:'SEND'}});
   return json(202,{date,since,message:'Release queued; existing workflow handles Comic'});
  }
  return json(404,{error:'Unknown operation'});
 }catch(err){
  console.error('daily-runner:',String(err.message||'request failed').slice(0,100));
  return json(502,{error:'Runner error: '+String(err.message||'request failed').slice(0,100)});
 }
};