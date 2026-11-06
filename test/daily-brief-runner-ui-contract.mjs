import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('private-runner/public/index.html','utf8');
const runner=fs.readFileSync('private-runner/netlify/functions/daily-brief-runner.mjs','utf8');
assert.equal((html.match(/class="step"/g)||[]).length,3,'Runner must have exactly Run, Upload, Deploy steps');
for(const label of ['01 — Generate','02 — Upload','03 — Deploy','Upload corrected ZIP','Refresh status','Deploy approved']){
 assert.ok(html.includes(label),'Missing visible workflow label: '+label);
}
assert.ok(!html.includes('03 — Edit'),'Redundant edited step should not exist');
assert.ok(!html.includes('id="reviewStatus"'),'Duplicate edited status should be removed');
assert.ok(html.includes("new Date().toLocaleTimeString"),'Refresh must show most recent GitHub check time');
assert.ok(html.includes("if(busy){queued=true"),'Overlapping refresh requests must be queued');
assert.ok(html.includes("if(queued){queued=false;queueMicrotask(refresh)"),'Queued refresh must actually execute');
assert.ok(html.includes("uploadPhase(data)"),'Upload result should directly control deployment state');
assert.ok(runner.includes("uploadReceipt?.data"),'Backend must read upload receipt');
assert.ok(runner.includes("Corrected review ZIP safely stored"),'Draft uploaded state must not be incorrectly labelled blocked');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1],{filename:'private-runner/public/index.html'});
console.log('Three-step runner and actionable refresh UI checks passed');
