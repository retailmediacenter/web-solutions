import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const src=p=>readFileSync(fileURLToPath(new URL(p,import.meta.url)),'utf8');
const runtime=src('../../client/public/export-runtime.js');
const shell=src('../../client/public/global-modal.js');
const css=src('../../client/public/global-modal.css');
const render=src('../src/render-site.js');

test('same existing order markup supports Booking-sized conditional result without server renderer changes',()=>{
 assert.match(render,/id="orderLivePanel"/);
 assert.match(render,/id="orderLiveClose"/);
 assert.match(render,/id="orderConfirmationCode"/);
 assert.match(shell,/modal-footer-live/);
  assert.match(shell,/d\.dataset\.commerceStatus/);
 assert.match(css,/data-commerce-status="true"/);
 assert.match(css,/max-height:78dvh/);
 assert.match(css,/data-commerce-result="true"/);
});
test('receipt gets its own close CTA and no permanent, stale form Submit',()=>{
 assert.match(shell,/f\.hidden=isLive/);
 assert.match(shell,/l\.hidden=!isLive/);
 assert.match(shell,/liveActions=first\(body,'#orderLivePanel \.dialog-actions'\)/);
 assert.match(shell,/MutationObserver\(\(\)=>dialogOpen\(dialog\)\)/);
 assert.match(runtime,/confirmation:receipt\.orderCode/);
 assert.match(runtime,/\$\('orderHeading'\)\.textContent='Zahtev je uspešno poslat'/);
 assert.match(runtime,/form\.hidden=true/);
});
test('only successful live order view is compact; cart, entry and booking remain separately scoped',()=>{
 assert.match(css,/\[data-commerce-status="true"\]/);
 assert.doesNotMatch(css,/html body dialog\.site-dialog\[data-modal-system="v419"\]\{height:fit-content/);
 assert.match(css,/\[data-booking-status="true"\]/);
});
