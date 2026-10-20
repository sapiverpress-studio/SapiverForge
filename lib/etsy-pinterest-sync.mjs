// Decide whether a successful Etsy public snapshot needs a Git commit and Pinterest handoff.
// Do not commit an unchanged timestamp on every 30-minute poll.
const REFRESH_MS=4*60*60*1000;
function canonical(items){
 if(!Array.isArray(items))return null;
 return JSON.stringify([...items].sort((a,b)=>Number(a.id)-Number(b.id)));
}
export function etsyPinterestSyncPlan({previousFeed,currentFeed,previousIds=[],now=Date.now()}={}){
 if(currentFeed?.shop!=='SapiverPrints'||!Array.isArray(currentFeed.items))throw Error('Unexpected live Etsy catalogue');
 const ids=new Set(currentFeed.items.map(item=>Number(item.id)));
 if(ids.size!==currentFeed.items.length||[...ids].some(id=>!Number.isSafeInteger(id)||id<1))throw Error('Bad live listing IDs');
 if(!Array.isArray(previousIds)||previousIds.some(id=>!Number.isSafeInteger(Number(id))))throw Error('Invalid previous Etsy IDs');
 const before=new Set(previousIds.map(Number));
 const newIds=[...ids].filter(id=>!before.has(id)).sort((a,b)=>a-b);
 const removedIds=[...before].filter(id=>!ids.has(id)).sort((a,b)=>a-b);
 const changed=previousFeed?.shop!=='SapiverPrints'||canonical(previousFeed?.items)!==canonical(currentFeed.items);
 const age=now-Date.parse(previousFeed?.generatedAt||'');
 const needsRefresh=changed||!Number.isFinite(age)||age>=REFRESH_MS||age< -300000;
 return {changed,needsRefresh,newIds,removedIds,shouldDispatch:changed&&newIds.length>0};
}
