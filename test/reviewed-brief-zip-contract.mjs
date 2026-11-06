import assert from 'node:assert/strict';
import { extractZip,stage } from '../scripts/import-reviewed-daily-brief-zip.mjs';
const crcTable=Array.from({length:256},(_,i)=>{let v=i;for(let j=0;j<8;j++)v=v&1?0xedb88320^(v>>>1):v>>>1;return v>>>0;});
function crc(buf){let c=0xffffffff;for(const b of buf)c=(c>>>8)^crcTable[(c^b)&255];return(c^0xffffffff)>>>0;}
function zip(files){
 let offset=0,locals=[],centrals=[];
 for(const [name,value] of Object.entries(files)){
  const n=Buffer.from(name),data=Buffer.from(value),sum=crc(data);
  const local=Buffer.alloc(30),central=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0,8);
  local.writeUInt32LE(sum,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(n.length,26);
  locals.push(local,n,data);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
  central.writeUInt32LE(sum,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);
  central.writeUInt16LE(n.length,28);central.writeUInt32LE(offset,42);
  centrals.push(central,n);offset+=local.length+n.length+data.length;
 }
 const cd=Buffer.concat(centrals),end=Buffer.alloc(22),count=Object.keys(files).length;
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(count,8);end.writeUInt16LE(count,10);
 end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,cd,end]);
}
const date='2026-11-06';
const review=zip({
 'README.txt':'Review only',
 'corrected-daily-brief.md':'Headline and source-checked draft',
 'corrected-newsletter-preview.html':'<main>Preview only; not for sending</main>',
 'verification-report.json':JSON.stringify({date,editorial_status:'source_checked_draft_not_publication_ready',brevo_draft_verified:false})
});
assert.equal(extractZip(review).size,4);
assert.equal(stage(review,date,{write:false}).kind,'review_only');
assert.throws(()=>stage(review,'2026-11-05',{write:false}),/Review status/);
assert.throws(()=>stage(zip({'../outside.txt':'danger'}),date,{write:false}),/Unsafe ZIP path/);
assert.throws(()=>stage(zip({'review.txt':'no manifest'}),date,{write:false}),/Missing publication file/);
assert.throws(()=>stage(zip({'news-intelligence/2026-11-06/manifest.json':'{}'}),date,{write:false}),/Missing publication file/);
assert.throws(()=>extractZip(Buffer.from('not zip')),/ZIP/);
const incorrect=Buffer.from(review);incorrect[40]^=1;
assert.throws(()=>extractZip(incorrect),/ZIP|checksum/);
console.log('ZIP upload validates review-only, edition match, missing release materials and ZIP safety.');
