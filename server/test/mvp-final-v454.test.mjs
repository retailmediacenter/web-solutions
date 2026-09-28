import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {getAdvisorDefinition,listBusinesses} from '../src/advisor.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function payload(id, businessData={phone:'+381 60 123 4567',locationMode:'physical',city:'Beograd',address:'Knez Mihailova 5'}){
 const def=getAdvisorDefinition(id);
 const answers={businessMode:def.operation.options[0],emphasis:def.emphasis.options[0],hybridChoice:'none'};
 for(const q of def.specials||[])answers[q.id]=q.id==='butcherGrillService'?'raw':false;
 return buildSitePayload({businessId:id,businessName:'Test firma',style:'warm',goal:'visit',answers,businessData});
}
test('V45.4: all 72 renderers have exactly one end contact with actual callable phone',()=>{
 const all=listBusinesses().filter(x=>x.pilot);assert.equal(all.length,72);
 for(const {id} of all){
  const html=renderHtml(payload(id));
  assert.equal((html.match(/id="kontakt"/g)||[]).length,1,id);
  assert.equal((html.match(/class="ws-v454-phone"/g)||[]).length,1,id);
  assert.match(html,/href="tel:\+381601234567"/);
  assert.match(html,/Pozovite[^<]*\+381 60 123 4567/);
  assert.doesNotMatch(html,/Čujemo se!|Prikaži lokaciju i navigaciju|ws-directions/);
  assert.ok(html.lastIndexOf('id="kontakt"')>html.indexOf('class="hero'),id+': contact is not last');
 }
});
test('V45.4: maps are on demand, directions are gone, service area never invents a pin',()=>{
 const exact=renderHtml(payload('hair-salon'));
 assert.equal((exact.match(/data-ws-map=/g)||[]).length,1);
 assert.match(exact,/class="ws-map-host"/);
 assert.doesNotMatch(exact,/<iframe|google\.com\/maps\/search|ws-directions/);
 const area=renderHtml(payload('plumber',{phone:'+381601234567',locationMode:'service-area',city:'Beograd'}));
 assert.match(area,/Područje rada/);assert.doesNotMatch(area,/data-ws-map=|ws-directions/);
 const online=renderHtml(payload('hair-salon',{phone:'+381601234567',locationMode:'online'}));
 assert.doesNotMatch(online,/id="lokacije"|data-ws-map=/);
});
test('V45.4: no dummy phone when API callers omit phone',()=>{
 const html=renderHtml(payload('butcher-shop',{locationMode:'online'}));
 assert.doesNotMatch(html,/href="tel:/);
 assert.equal((html.match(/id="kontakt"/g)||[]).length,1);
});
test('V45.4: existing Booking and non-Booking service request targets are not removed',()=>{
 for(const id of ['hair-salon','plumber','auto-service']){
  const site=payload(id),html=renderHtml(site);
  assert.match(html,/id="requestForm"/);
  assert.match(html,/id="kontakt"/);
  assert.match(html,/id="bookingData"/);
  if(site.siteConfig.capabilities.booking.enabled)assert.match(html,/id="zakazivanje"/);
  else assert.match(html,/class="service-contact-form"/);
 }
});
test('V45.4: only existing UI collects the staged inputs; booking/export request payload is unchanged',()=>{
 const ui=readFileSync(path.join(root,'client/src/main.jsx'),'utf8');
 assert.match(ui,/companyStage===0/);
 assert.match(ui,/companyStage===1/);
 assert.match(ui,/companyStage===2/);
 assert.match(ui,/companyStage===3/);
 assert.match(ui,/companyStage===4/);
 assert.match(ui,/\/api\/site\/generate/);
 assert.match(ui,/\/api\/site\/export/);
 assert.match(ui,/externalBookingUrl/);
 assert.match(ui,/bookingPairing|exportPairing/);
});
