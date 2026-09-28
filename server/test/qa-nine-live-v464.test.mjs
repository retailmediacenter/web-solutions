import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scenarios,buildQaPayload} from '../../scripts/publication/scenarios.mjs';

const slugs=['minimarket','butik','auto-servis','vodoinstalater','vinoteka','mesara','frizer','restoran','konsultant'];

test('V46 QA: all nine original stable public SITE IDs remain unique',()=>{
 assert.deepEqual(scenarios.map(s=>s.slug),slugs);
 assert.equal(new Set(scenarios.map(s=>s.siteId)).size,9);
 assert.ok(scenarios.every(s=>/^[A-Za-z0-9_-]{24}$/.test(s.siteId)));
});

test('V46 QA: each scenario has real Booking or owner-authorized Commerce facts',()=>{
 for(const s of scenarios){
  const p=buildQaPayload(s),site=p.siteConfig;
  assert.equal(Boolean(site.capabilities.booking?.enabled),s.expect.booking,s.slug+' Booking');
  assert.equal(Boolean(site.capabilities.commerce),s.expect.commerce,s.slug+' Commerce');
  if(s.expect.booking)assert.ok(site.bookingProfile?.services?.length,s.slug+' missing Booking services');
  else assert.equal(site.bookingProfile,null,s.slug+' fake Booking profile');
  if(s.expect.commerce){
   assert.ok(site.siteProfile?.commerce?.products?.length,s.slug+' missing Commerce catalog');
   assert.equal(site.siteProfile.services.length,s.expect.booking?site.bookingProfile.services.length:0,s.slug+' owner profile');
  }
  assert.equal(site.bookingTransport,undefined);
  assert.equal(site.commerceTransport,undefined);
 }
});

test('V46 QA: protected route and build transport source keep administrator secret server-side',()=>{
 const api=readFileSync(new URL('../src/qa-routes.js',import.meta.url),'utf8');
 const build=readFileSync(new URL('../../scripts/publication/build.mjs',import.meta.url),'utf8');
 const consoleJs=readFileSync(new URL('../../scripts/publication/qa-console.js',import.meta.url),'utf8');
 assert.ok(api.includes('const profile=commerce?site.siteProfile:site.bookingProfile;'));
 assert.ok(build.includes('commerceLive'));
 assert.ok(build.includes('qaLive'));
 assert.ok(build.includes('RMC_QA_LIVE_SLUGS'));
 assert.ok(!consoleJs.includes('RMC_QA_ADMIN_KEY'));
 assert.ok(consoleJs.includes('sessionStorage'));
 assert.ok(build.includes('STOP: QA tajna u javnom HTML-u'));
});
