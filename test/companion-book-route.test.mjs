import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCompanionHandler} from '../lib/companion-book-route.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const id='hb-'+'a'.repeat(32),url='https://suite.sapiverpress.co.uk/activity-books/'+id+'/',html=Buffer.from('<html>Book</html>'),jpg=Buffer.from([255,216,255,217]);
const prefix='books/'+id+'/',receipt={bookId:id,url,status:'pilot',manifestHash:hash('m'),interiorHash:hash('i'),interactiveHash:hash(html),scriptHash:createHash('sha256').update('script').digest('base64'),pages:{'pages/00.jpg':hash(jpg)},previewHash:hash('temporary-test-key')};
const auth={Authorization:'Basic '+Buffer.from('review:temporary-test-key').toString('base64')};
const get=(r=receipt,asset=html)=>createCompanionHandler({get:async(k)=>k===prefix+'receipt'?r:k===prefix+'index.html'?asset:k===prefix+'pages/00.jpg'?jpg:null});
test('all private assets require correct credentials; receipt never exposes preview hash',async()=>{
 const handle=get();
 for(const path of ['','publication.json','pages/00.jpg'])assert.equal((await handle(new Request(url+path))).status,401);
 const a=await handle(new Request(url,{headers:auth}));assert.equal(a.status,200);assert.equal(await a.text(),html.toString());assert.match(a.headers.get('content-security-policy'),/connect-src 'none'/);
 const b=await handle(new Request(url+'publication.json',{headers:auth}));assert.equal(b.status,200);assert.ok(!('previewHash' in await b.json()));
 assert.equal((await handle(new Request(url+'pages/00.jpg',{headers:auth}))).status,200);
});
test('only explicitly approved records are public and hash mismatches fail closed',async()=>{
 assert.equal((await get({...receipt,status:'published'})(new Request(url))).status,401);
 assert.equal((await get({...receipt,status:'published',publicApprovedAt:'2026-11-27T00:00:00Z'})(new Request(url))).status,200);
 assert.equal((await get(receipt,Buffer.from('wrong'))(new Request(url,{headers:auth}))).status,503);
 for(const path of ['BOOK_PLAN.json','pages/36.jpg','pages/999.jpg','%2e%2e%2fprivate'])assert.equal((await get()(new Request(url+path,{headers:auth}))).status,404);
 assert.equal((await get()(new Request(url,{method:'POST',headers:auth}))).status,405);
 assert.equal((await get(null)(new Request(url))).status,404);
});
