import assert from 'node:assert/strict';
import { gitBlobSha } from '../scripts/git-blob-sha.mjs';
const input=Buffer.from([104,101,108,108,111,32,119,111,114,108,100,10]);
assert.equal(gitBlobSha(input),'3b18e512dba79e4c8300dd08aeb37f8e728b8dad');
assert.equal(gitBlobSha(''),'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
assert.equal(gitBlobSha(input).length,40);
console.log('GitHub approval review receipt matches Git blob hashes');
