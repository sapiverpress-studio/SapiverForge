import crypto from 'node:crypto';

// GitHub Contents SHA is SHA-1 of 'blob <length>\\0' plus original bytes.
export function gitBlobSha(value){
 const bytes=Buffer.isBuffer(value)?value:Buffer.from(value);
 return crypto.createHash('sha1').update(Buffer.concat([
  Buffer.from('blob '+bytes.length+String.fromCharCode(0)),bytes
 ])).digest('hex');
}
