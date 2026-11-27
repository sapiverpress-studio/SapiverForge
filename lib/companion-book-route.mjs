import {createHash,timingSafeEqual} from 'node:crypto';
const ORIGIN='https://suite.sapiverpress.co.uk',hash=x=>createHash('sha256').update(x).digest('hex');
const validHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Frame-Options':'DENY'};
const answer=(body,status=200,extra={})=>new Response(body,{status,headers:{...headers,...extra}});
function authorise(request,record){
 if(!validHash(record.previewHash))return false;
 const auth=request.headers.get('authorization')||'';
 if(auth.length>512||!auth.startsWith('Basic '))return false;
 const value=Buffer.from(auth.slice(6),'base64').toString('utf8');
 if(!value.startsWith('review:'))return false;
 return timingSafeEqual(Buffer.from(hash(value.slice(7)),'hex'),Buffer.from(record.previewHash,'hex'));
}
export function createCompanionHandler(store){
 return async request=>{
  try{
   if(!['GET','HEAD'].includes(request.method))return answer('Method not allowed',405,{Allow:'GET, HEAD'});
   const url=new URL(request.url),m=/^\/activity-books\/(hb-[a-f0-9]{32})(?:\/(.*))?$/.exec(url.pathname);
   if(!m)return answer('Book not found',404);
   const [,id,relative]=m,base='/activity-books/'+id+'/',prefix='books/'+id+'/';
   const name=relative||'index.html';
   if(!/^(?:index\.html|publication\.json|pages\/(?:0[0-9]|[12][0-9]|3[0-5]|39|40)\.jpg)$/.test(name))return answer('Book not found',404);
   const r=await store.get(prefix+'receipt',{type:'json',consistency:'strong'});
   if(!r||r.bookId!==id||r.url!==ORIGIN+base||!validHash(r.interactiveHash)||!validHash(r.manifestHash)||!validHash(r.interiorHash))return answer('Book not found',404);
   const live=r.status==='published'&&typeof r.publicApprovedAt==='string'&&Number.isFinite(Date.parse(r.publicApprovedAt));
   if(!live&&(r.status!=='pilot'||!authorise(request,r)))return answer('Private companion review',401,{'WWW-Authenticate':'Basic realm="Hen and Bea private review", charset="UTF-8"'});
   if(relative===undefined)return answer(null,308,{Location:base});
   if(name==='publication.json'){
    const receipt={bookId:r.bookId,manifestHash:r.manifestHash,interiorHash:r.interiorHash,interactiveHash:r.interactiveHash,url:r.url,status:r.status,pages:r.pages};
    return answer(request.method==='HEAD'?null:JSON.stringify(receipt),200,{'Content-Type':'application/json; charset=utf-8'});
   }
   const digest=name==='index.html'?r.interactiveHash:r.pages?.[name];
   if(!validHash(digest))return answer('Book not found',404);
   const raw=await store.get(prefix+name,{type:'arrayBuffer',consistency:'strong'});
   if(!raw||hash(Buffer.from(raw))!==digest)return answer('Book asset unavailable',503);
   const isHtml=name==='index.html';
   if(isHtml&&!/^[A-Za-z0-9+/]{43}=$/.test(r.scriptHash||''))return answer('Book asset unavailable',503);
   const csp=isHtml?"default-src 'none'; script-src 'sha256-"+r.scriptHash+"'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'":"default-src 'none'; frame-ancestors 'none'";
   return answer(request.method==='HEAD'?null:raw,200,{'Content-Type':isHtml?'text/html; charset=utf-8':'image/jpeg','Content-Security-Policy':csp});
  }catch{return answer('Companion temporarily unavailable',503);}
 };
}
