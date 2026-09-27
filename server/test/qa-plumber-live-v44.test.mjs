import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scenarios,buildQaPayload} from '../../scripts/publication/scenarios.mjs';

test('V44 plumber and frizer keep distinct FIXED QA siteIds and the intended timing modes',()=>{
 const frizer=scenarios.find(s=>s.slug==='frizer');
 const voda=scenarios.find(s=>s.slug==='vodoinstalater');
 assert.ok(frizer&&voda);
 assert.notEqual(frizer.siteId,voda.siteId);
 assert.equal(frizer.expect.timingMode,'EXACT_TIME');
 assert.equal(voda.expect.timingMode,'DAY_PART');
 for(const s of [frizer,voda]){
  const p=buildQaPayload(s);
  assert.equal(p.siteConfig.capabilities.booking.timingMode,s.expect.timingMode);
  assert.equal(p.siteConfig.bookingTransport,undefined,'Do public QA build-a transport nije aktiviran');
 }
});

test('V44 public builder permits only frizer/plumber; no pairing secrets are written',()=>{
 const source=readFileSync(new URL('../../scripts/publication/build.mjs',import.meta.url),'utf8');
 const allowed=source.match(/const permittedLiveQa=new Set\(\[([^\]]+)\]\)/)?.[1];
 assert.match(allowed||'',/frizer/);
 assert.match(allowed||'',/vodoinstalater/);
 // A builder may name a secret in a BLOCKING safety check: that is not a leak.
 // Check the public QA client instead, plus the builder's actual HTML guard.
 const qaClient=readFileSync(new URL('../../scripts/publication/qa-console.js',import.meta.url),'utf8');
 assert.ok(!qaClient.includes('RMC_QA_ADMIN_KEY'),'Public QA JS must not embed the administrator secret');
 assert.ok(source.includes('STOP: QA tajna u javnom HTML-u'),'Build must reject secret values in generated public HTML');
 assert.ok(source.includes('BOOKING_UPARIVANJE.txt'));
});
