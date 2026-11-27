// Reconcile a disposable checkout with the current deployed static file manifest.
// Only recover exact hash-verified bytes; never modify the repository or live site.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync,mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
const site='47bda30e-4698-4cf5-bcd4-d59785e1f399',token=process.env.NETLIFY_AUTH_TOKEN;
const expected='6afc2d79bbca04e34524f8bc',root=resolve(process.argv[2]||'baseline/public');
const reconcile=process.argv.includes('--reconcile');
if(!token)throw Error('Missing deploy credential');
const hash=b=>createHash('sha1').update(b).digest('hex');
const headers={Authorization:'Bearer '+token};
const api=async(path)=>{
 const r=await fetch('https://api.netlify.com/api/v1'+path,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('Netlify verification HTTP '+r.status);
 return {data:await r.json(),link:r.headers.get('link')||''};
};
async function checkSite(){
 const {data:s}=await api('/sites/'+site);
 if(s.id!==site||s.published_deploy?.id!==expected)throw Error('Live deploy changed; no release attempted');
}
await checkSite();
const remote=new Map();
function safePath(p){return typeof p==='string'&&p.startsWith('/')&&p.length<1024&&!p.includes('\\')&&!/[\u0000-\u001f]/.test(p)&&p.slice(1).split('/').every(x=>x&&x!=='.'&&x!=='..');}
for(let page=1;page<=100;page++){
 const {data,link}=await api('/sites/'+site+'/files?per_page=100&page='+page);
 if(!Array.isArray(data))throw Error('Unexpected file manifest');
 for(const f of data){
  if(!safePath(f.path)||! /^[a-f0-9]{40}$/.test(f.sha)||remote.has(f.path))throw Error('Unverified file manifest or pagination');
  remote.set(f.path,{sha:f.sha,size:f.size});
 }
 if(!link.includes('rel="next"')&&data.length<100)break;
 if(page===100)throw Error('File manifest exceeded verification limit');
}
function snapshot(){
 const local=new Map();
 function walk(dir,rel=''){
  for(const name of readdirSync(dir)){
   const p=join(dir,name),key=rel+'/'+name,stat=lstatSync(p);
   if(!safePath(key)||stat.isSymbolicLink())throw Error('Unexpected local path');
   if(stat.isDirectory())walk(p,key);
   else if(stat.isFile())local.set(key,hash(readFileSync(p)));
   else throw Error('Unexpected local entry');
  }
 }
 walk(root);return local;
}
const controls=new Set(['/_headers','/_redirects']);
function compare(local){
 const missing=[],extra=[],changed=[];
 for(const [p,f] of remote){if(!local.has(p))missing.push(p);else if(local.get(p)!==f.sha)changed.push(p);}
 // Netlify can consume these two config files during processing: preserve
 // the source snapshot's copies when not present in the served manifest.
 for(const p of local.keys())if(!remote.has(p)&&!controls.has(p))extra.push(p);
 return {missing,extra,changed};
}
if(!remote.has('/index.html')||remote.size<50)throw Error('Incomplete live manifest');
let diffs=compare(snapshot());
console.log('Live file manifest: '+remote.size+' files; missing '+diffs.missing.length+', extra '+diffs.extra.length+', changed '+diffs.changed.length);
if(reconcile){
 // Do not write until every replacement has been independently verified.
 const pending=[...diffs.missing,...diffs.changed];
 const sizes=pending.map(p=>remote.get(p).size);
 if(sizes.some(n=>!Number.isSafeInteger(n)||n<0||n>200_000_000)||sizes.reduce((a,b)=>a+b,0)>600_000_000)throw Error('Recovery size exceeds safe limit');
 const recovered=[];
 for(const p of pending){
  const entry=remote.get(p),encoded=p.slice(1).split('/').map(encodeURIComponent).join('/');
  const response=await fetch('https://api.netlify.com/api/v1/sites/'+site+'/files/'+encoded,{headers:{...headers,'Content-Type':'application/vnd.bitballoon.v1.raw','Accept':'application/vnd.bitballoon.v1.raw'},redirect:'error',signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('Raw live file recovery HTTP '+response.status+' for '+p);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==entry.size||hash(bytes)!==entry.sha)throw Error('Raw live file hash mismatch for '+p);
  recovered.push([p,bytes]);
 }
 await checkSite();
 for(const p of diffs.extra)unlinkSync(join(root,p.slice(1)));
 for(const [p,bytes] of recovered){const target=join(root,p.slice(1));mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}
 console.log('Recovered '+recovered.length+' exact live files; removed '+diffs.extra.length+' non-live files from disposable checkout only.');
 diffs=compare(snapshot());
}
const count=diffs.missing.length+diffs.changed.length+diffs.extra.length;
if(count)throw Error('Baseline has '+count+' unverified static files; refusing production release');
await checkSite();
console.log('Verified all '+remote.size+' existing live static file hashes against the baseline.');
