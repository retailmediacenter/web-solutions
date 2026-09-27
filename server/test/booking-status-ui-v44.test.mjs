import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const asset=name=>readFileSync(new URL(`../../client/public/${name}`,import.meta.url),'utf8');
test('V44 B1: Booking states have a dynamic heading and keep error actions conditional',()=>{
  const js=asset('global-modal.js');
  assert.match(js,/dialog\.classList\.contains\('booking-submit-dialog'\)/);
  assert.match(js,/states\.find\(section=>!section\.hidden\)/);
  assert.match(js,/MutationObserver\(refresh\)/);
  assert.match(js,/else if\(!bookingStatus\)/,'Booking actions must NOT be hoisted into a permanent footer');
});
test('V44 B1: status modal is compact; only an active error state shows Retry',()=>{
  const css=asset('global-modal.css');
  assert.match(css,/\[data-booking-status="true"\]\{\s*height:fit-content;/);
  assert.match(css,/\.booking-submit-state > section > :is\(\.kicker,h2\)/);
  assert.match(css,/section:not\(\[hidden\]\) \.dialog-actions/);
});
