// Private one-book handoff via existing owner cross-repository token.
// Neither source ZIP nor decrypted companion is committed or uploaded as an artifact.
import {generateKeyPairSync,randomBytes,privateDecrypt,createDecipheriv,constants} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const dir=process.env.COMPANION_TMP;
if(!dir||!process.env.GH_TOKEN)throw Error('Missing private handoff configuration');
const repo='sapiverpress-studio/Poster_gen';
const nonce=randomBytes(16).toString('hex'),title='Companion pilot '+nonce;
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:3072});
const pem=publicKey.export({type:'spki',format:'pem'});
const gh=(args,opts={})=>execFileSync('gh',args,{encoding:'utf8',timeout:60000,stdio:['pipe','pipe','pipe'],...opts});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const dispatch=await fetch('https://api.github.com/repos/'+repo+'/actions/workflows/poster-publication.yml/dispatches',{
  method:'POST',headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
  redirect:'error',signal:AbortSignal.timeout(20000),
  body:JSON.stringify({ref:'main',inputs:{seo_mode:'companion_pilot',companion_nonce:nonce,companion_public_key:Buffer.from(pem).toString('base64')}})
 });
 if(!dispatch.ok)throw Error('Poster_gen workflow dispatch HTTP '+dispatch.status+'; no assets transferred');

 console.log('Exact companion export requested.');
 let run;
 for(let n=0;n<100;n++){
  const j=JSON.parse(gh(['api','repos/'+repo+'/actions/workflows/poster-publication.yml/runs?event=workflow_dispatch&per_page=50']));
  const matches=j.workflow_runs.filter(r=>r.display_title===title);
  if(matches.length>1)throw Error('Ambiguous export run');
  run=matches[0];
  if(run?.status==='completed')break;
  await sleep(10000);
 }
 if(!run||run.status!=='completed'||run.conclusion!=='success')throw Error('Companion export not successful; see Poster_gen run '+(run?.id||'not found'));
 const artifact='companion-encrypted-'+nonce;
 gh(['run','download',String(run.id),'--repo',repo,'--name',artifact,'--dir',dir]);
 const bytes=readFileSync(join(dir,'companion.enc'));
 if(bytes.length<420||bytes.length>20_000_000||bytes.readUInt32BE(0)!==384)throw Error('Invalid encrypted handoff');
 const aes=privateDecrypt({key:privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},bytes.subarray(4,388));
 const d=createDecipheriv('aes-256-gcm',aes,bytes.subarray(388,400));d.setAAD(Buffer.from('hen-bea-pilot-v1:'+nonce));d.setAuthTag(bytes.subarray(400,416));
 const plain=Buffer.concat([d.update(bytes.subarray(416)),d.final()]);
 writeFileSync(join(dir,'companion.zip'),plain,{mode:0o600});
 console.log('Encrypted companion authenticated and recovered; export run '+run.id);
}catch(e){console.error('Companion handoff failed: '+(e.status!==undefined?'GitHub API command refused or failed':e.message));process.exitCode=1;}
