// Verify the original live website against the source snapshot before a route-only release.
// Abort on ANY unexplained asset change or wrong site; do not print sensitive file contents.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
const site='47bda30e-4698-4cf5-bcd4-d59785e1f399',token=process.env.NETLIFY_AUTH_TOKEN;
const expected='6afc2d79bbca04e34524f8bc',root=resolve(process.argv[2]||'baseline/public');
if(!token)throw Error('Missing deploy credential');
const api=async(path)=>{
 const r=await fetch('https://api.netlify.com/api/v1'+path,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('Netlify verification HTTP '+r.status);
 return {data:await r.json(),link:r.headers.get('link')||''};
};
const {data:siteInfo}=await api('/sites/'+site);
if(siteInfo.id!==site||siteInfo.published_deploy?.id!==expected)throw Error('Live deploy changed; no release attempted');
const remote=new Map();
for(let page=1;page<=100;page++){
 const {data,link}=await api('/sites/'+site+'/files?per_page=100&page='+page);
 if(!Array.isArray(data))throw Error('Unexpected file manifest');
 for(const f of data){if(typeof f.path!=='string'||!f.path.startsWith('/')||!f.sha||remote.has(f.path))throw Error('Unverified file manifest or pagination');remote.set(f.path,f.sha);}
 if(!link.includes('rel="next"')&&data.length<100)break;
 if(page===100)throw Error('File manifest exceeded verification limit');
}
const local=new Map();
function walk(dir,rel=''){
 for(const name of readdirSync(dir)){
  const p=join(dir,name),key=rel+'/'+name;
  if(statSync(p).isDirectory())walk(p,key);
  else local.set(key,createHash('sha1').update(readFileSync(p)).digest('hex'));
 }
}
walk(root);
const ignored=new Set(['/_headers','/_redirects']);
const mismatches=[];
for(const [p,sha] of remote)if(!ignored.has(p)&&local.get(p)!==sha)mismatches.push(p);
for(const p of local.keys())if(!ignored.has(p)&&!remote.has(p))mismatches.push(p);
if(mismatches.length)throw Error('Baseline has '+mismatches.length+' unverified static files; refusing production release');
if(!remote.has('/index.html')||remote.size<50)throw Error('Incomplete live manifest');
console.log('Verified all '+remote.size+' existing live static file hashes against the baseline.');
