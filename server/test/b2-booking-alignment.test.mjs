import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {SERVICE_BUSINESSES,serviceProfile,getServiceSpecial} from '../src/service-engine.js';
import {exportSiteZip} from '../src/exporter.js';
const clientFile=name=>readFileSync(new URL('../../client/'+name,import.meta.url),'utf8');
const siteId='AbCdEfGhIjKlMnOpQrStUvWx',origin='https://api.example.org';
const transport={siteId,apiBaseUrl:origin};
function site(id,enabled=true){
 const question=id==='wine-shop'?'wineTastings':getServiceSpecial(id).id;
 return buildSitePayload({businessId:id,businessName:`Test ${id}`,goal:'visit',style:'modern',answers:{[question]:enabled}});
}
test('B2: every selected business uses a single, explicit timing contract and no legacy booking form in preview',()=>{
 assert.equal(SERVICE_BUSINESSES.length,36);
 for(const id of SERVICE_BUSINESSES){
  const p=site(id),book=p.siteConfig.capabilities.booking;
  const expected=serviceProfile(id).mode==='request-slot'?'DAY_PART':'EXACT_TIME';
  assert.equal(book.timingMode,expected,`${id}: timingMode`);
  assert.equal(p.siteConfig.bookingProfile.services.length,book.services.length,`${id}: service profile`);
  const html=renderHtml(p);
  assert.match(html,/bookingSubmitPreview/,`${id}: preview status`);
  assert.match(html,/DEMONSTRACIONI PREGLED/,`${id}: preview explanation`);
  assert.doesNotMatch(html,/booking-link\.js|RMCB1|Poruka je spremna|Kopiraj zahtev/,`${id}: stale booking UX`);
  assert.equal(html.includes('name="daypart"'),expected==='DAY_PART',`${id}: dayPart form`);
  assert.equal(html.includes('name="time" type="time"'),expected==='EXACT_TIME',`${id}: exact-time form`);
  p.siteConfig.bookingTransport=transport;
  const published=renderHtml(p);
  assert.match(published,/bookingSubmitSuccess|bookingReservationCode/);
  assert.doesNotMatch(published,/booking-link\.js|Kopiraj zahtev/);
 }
});
test('B2: disabled Booking has no pairing profile; contact-only flow stays functional',()=>{
 for(const id of SERVICE_BUSINESSES){
  const p=site(id,false);
  assert.equal(p.siteConfig.bookingProfile,null,`${id}: disabled profile`);
  assert.equal(p.siteConfig.capabilities.booking.enabled,false);
  const html=renderHtml(p);
  assert.doesNotMatch(html,/bookingSubmitPreview|bookingSubmitSuccess/);
  assert.match(html,/Kontakt/);
 }
 const wine=site('wine-shop',false);
 assert.equal(wine.siteConfig.bookingProfile,null);
 assert.doesNotMatch(renderHtml(wine),/id="tastingForm"/);
});
test('B2: wine tastings have the same exact-time transport and preview truthfulness',()=>{
 const p=site('wine-shop');const book=p.siteConfig.capabilities.booking;
 assert.equal(book.timingMode,'EXACT_TIME');assert.equal(book.services.length,3);
 const html=renderHtml(p);
 assert.match(html,/id="wineBookingPreview"/);
 assert.match(html,/href="booking.css"/);
 assert.match(html,/Pošalji zahtev za degustaciju/);
 assert.doesNotMatch(html,/RMCB1|booking-link\.js|Kopiraj zahtev/);
 p.siteConfig.bookingTransport=transport;
 const published=renderHtml(p);
 assert.match(published,/wineReservationCode/);
 assert.doesNotMatch(published,/booking-link\.js|viberBooking|waBooking/);
});
test('B2: frontend has no V43.2 pairing textarea; public V39.5 JS is excluded from build',()=>{
 const main=clientFile('src/main.jsx'),index=clientFile('index.html'),vite=clientFile('vite.config.js');
 assert.doesNotMatch(main,/bookingLinkCode|setBookingLinkCode|bookingPairing:/);
 assert.doesNotMatch(index,/booking-link\.js/);
 assert.match(vite,/exclude-legacy-v395-from-public-build/);
});
test('B2: send schema handles EXACT_TIME and DAY_PART over same API without a private token',async()=>{
 const window={},calls=[];let counter=0;
 runInNewContext(clientFile('public/booking-submit.js'),{
  window,URL,AbortSignal,crypto:{randomUUID:()=>`12345678-1234-4234-8234-${String(++counter).padStart(12,'0')}`},
  fetch:async(url,opts)=>{
   calls.push({url,options:opts});
   const payload=JSON.parse(opts.body).booking;
   return {ok:true,json:async()=>({requestId:payload.requestId,reservationCode:'ABCDEFGH'})};
  }
 });
 for(const fields of [
  {serviceId:'salon-1',serviceName:'Šišanje',date:'2026-11-12',time:'12:00',timingMode:'EXACT_TIME',dayPart:''},
  {serviceId:'plumber-1',serviceName:'Intervencija',date:'2026-11-12',time:'',timingMode:'DAY_PART',dayPart:'AFTERNOON'}
 ])await window.RMCBookingSubmit.send(transport,{clientName:'Dragan',phone:'060123456',note:'',...fields});
 assert.equal(calls.length,2);
 for(let i=0;i<2;i++){
  assert.equal(calls[i].url,origin+'/api/booking/requests');
  assert.equal(calls[i].options.headers.Authorization,undefined);
  const sent=JSON.parse(calls[i].options.body);
  assert.equal(sent.siteId,siteId);
  assert.equal(sent.booking.timingMode,i?'DAY_PART':'EXACT_TIME');
  assert.equal(sent.booking.dayPart,i?'AFTERNOON':'');
  assert.equal(sent.booking.time,i?'':'12:00');
 }
});
test('B2: exported service ZIP embeds only the new sender (no legacy booking JS)',()=>{
 const p=site('hair-salon');p.catalog.hero='';p.catalog.services=[];
 p.siteConfig.bookingTransport=transport;
 const zip=exportSiteZip(p);
 assert.ok(zip.includes(Buffer.from('booking-submit.js')));
 assert.ok(zip.includes(Buffer.from('booking-runtime.js')));
 assert.ok(!zip.includes(Buffer.from('booking-link.js')));
});
test('B2: wine ZIP has booking.css and the exact-time sender, never the old cryptographic link',()=>{
 const p=site('wine-shop');p.siteConfig.bookingTransport=transport;
 const zip=exportSiteZip(p);
 assert.ok(zip.includes(Buffer.from('booking-submit.js')));
 assert.ok(zip.includes(Buffer.from('booking.css')));
 assert.ok(!zip.includes(Buffer.from('booking-link.js')));
});
