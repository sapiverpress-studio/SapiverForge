// Dispatch to Comic, preferring Actions write and falling back to Contents write.
// Never log provider error bodies, access tokens, or pending content.
const TARGET='sapiverpress-studio/SapiverPress_comic_public';
const ENDPOINT='https://api.github.com/repos/'+TARGET;
export const RELEASE_EVENT='sapiver_forge_approved_release';
export const ETSY_EVENT='sapiver_prints_new_listing';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const SHA=/^[a-f0-9]{40}$/;
const CANDIDATE=/^[a-f0-9]{64}$/;
function safeInputs(kind,inputs){
 if(kind==='forge'){
   const {edition_date,source_sha,candidate_id,confirm}=inputs||{};
   if(!DATE.test(edition_date)||!SHA.test(source_sha)||!CANDIDATE.test(candidate_id)||confirm!=='SEND')
     throw Error('Incomplete approved Forge release identity: no dispatch attempted');
   return {workflow:'daily-brief-social-bridge.yml',event:RELEASE_EVENT,
     inputs:{edition_date,source_sha,candidate_id,confirm}};
 }
 if(kind==='etsy'){
   const feed_sha=String(inputs?.feed_sha||'');
   if(!SHA.test(feed_sha)||Object.keys(inputs||{}).some(k=>k!=='feed_sha'))
     throw Error('Etsy dispatch requires only an exact approved feed commit SHA');
   return {workflow:'sapiverprints-pinterest.yml',event:ETSY_EVENT,inputs:{feed_sha}};
 }
 throw Error('Unknown Comic dispatch kind');
}
export async function dispatchComic({kind,inputs={},token,fetchImpl=fetch}={}){
 const request=safeInputs(kind,inputs);
 if(typeof token!=='string'||!token.trim())throw Error('CROSS_REPO_GITHUB_TOKEN missing: configure GitHub token with Comic Actions:write OR Contents:write');
 const headers={Authorization:'Bearer '+token.trim(),Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 const send=async(url,body)=>{
   const response=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   return response.status;
 };
 const first=await send(ENDPOINT+'/actions/workflows/'+request.workflow+'/dispatches',{ref:'main',inputs:request.inputs});
 if(first===204)return {route:'workflow_dispatch',accepted:true};
 if(![403,404].includes(first))throw Error('Comic Actions dispatch refused HTTP '+first+'; no fallback for uncertain result');
 const second=await send(ENDPOINT+'/dispatches',{event_type:request.event,client_payload:request.inputs});
 if(second===204)return {route:'repository_dispatch',accepted:true};
 throw Error('Comic dispatch permissions unavailable (Actions HTTP '+first+', Contents HTTP '+second+'). Grant CROSS_REPO_GITHUB_TOKEN Comic Actions:write or Contents:write; no social publication was started.');
}
