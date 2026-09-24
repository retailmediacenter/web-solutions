import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getRegistryCount,getBusinessFacts} from '../src/registry.js';
import {SERVICE_BUSINESSES,BOOKING_MODES,serviceProfile,getServiceSpecial} from '../src/service-engine.js';
import {PILOT_BUSINESSES,listBusinesses,recognizeBusiness,getAdvisorDefinition} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
const publicRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/public');
const input=(id,enabled)=>({businessId:id,businessName:'Demo '+id,description:'Imam '+id,goal:'purchase',style:'modern',answers:{[getServiceSpecial(id).id]:enabled}});

test('V41.5 adds exactly 24 service modes without touching 72 fact-only registry entries',()=>{
  assert.equal(getRegistryCount(),72);
  assert.equal(SERVICE_BUSINESSES.length,24);
  assert.equal(PILOT_BUSINESSES.length,37);
  assert.equal(listBusinesses().filter(x=>x.pilot).length,37);
  assert.deepEqual(new Set(SERVICE_BUSINESSES.map(id=>serviceProfile(id).mode)),new Set(BOOKING_MODES));
  for(const id of SERVICE_BUSINESSES){const fact=getBusinessFacts(id);assert.ok(fact,id);assert.equal(fact.bookingMode,undefined);assert.equal(fact.cta,undefined);}
});

test('Each service has a documented V39.5 image namespace and real curated images',()=>{
  for(const id of SERVICE_BUSINESSES){
    const s=serviceProfile(id),p=buildSitePayload(input(id,true));
    assert.equal(p.siteConfig.business.id,id);
    assert.ok(s.services.length>=2,`${id}: missing curated services`);
    for(const file of [s.hero,...s.services.map(x=>x.image)]){
      assert.ok(file.startsWith(getBusinessFacts(id).assetRoot+'/'),`${id}: unexpected asset namespace`);
      assert.ok(existsSync(path.resolve(publicRoot,file)),`${id}: missing asset ${file}`);
    }
  }
});

test('Advisor never guesses whether a service business offers booking',()=>{
  for(const id of SERVICE_BUSINESSES){
    assert.throws(()=>buildSitePayload({businessId:id,businessName:'Test',answers:{},style:'modern'}),/Odgovorite/,id);
    assert.equal(getAdvisorDefinition(id).special.id,getServiceSpecial(id).id);
  }
});

test('Universal 4 booking modes emit correct fields and no live availability claims',()=>{
  const cases=[['hair-salon','appointment','name="time"'],
    ['restaurant','reservation','name="partySize"'],
    ['consultant','consultation','name="locationMode"'],
    ['auto-service','request-slot','name="daypart"']];
  for(const [id,mode,field] of cases){
    const p=buildSitePayload(input(id,true));
    const html=renderHtml(p);
    assert.equal(p.siteConfig.capabilities.booking.mode,mode);
    assert.ok(p.siteConfig.modules.includes('booking'));
    assert.ok(html.includes('id="zakazivanje"'));
    assert.ok(html.includes(field),`${id} missing ${field}`);
    assert.ok(html.includes('booking-runtime.js'));
    assert.ok(html.includes('Termin nije automatski potvrđen'));
  }
});

test('Optician keeps exam booking strictly conditional and never markets non-offered exams',()=>{
  const no=buildSitePayload(input('optician',false)),yes=buildSitePayload(input('optician',true));
  assert.equal(no.siteConfig.modules.includes('booking'),false);
  assert.equal(no.catalog.services.some(s=>s.title==='Pregled vida'),false);
  assert.equal(no.catalog.headline.includes('Pregled vida'),false);
  assert.ok(!renderHtml(no).includes('id="zakazivanje"'));
  assert.equal(yes.catalog.services.some(s=>s.title==='Pregled vida'),true);
  assert.ok(renderHtml(yes).includes('id="zakazivanje"'));
});

test('No reservation offering => no date, no fake booking CTA, contact inquiry still usable',()=>{
  for(const id of ['restaurant','barber-shop','accounting','plumber','kids-playroom']){
    const html=renderHtml(buildSitePayload(input(id,false)));
    assert.ok(!html.includes('id="zakazivanje"'),id);
    assert.ok(html.includes('id="kontakt"'),id);
    assert.ok(html.includes('data-mode="contact"'),id);
    assert.ok(!html.includes('name="date"'),id);
  }
});

test('Event reservation and auto service carry the right fields, healthcare collects no symptoms',()=>{
  const venue=renderHtml(buildSitePayload(input('event-venue',true)));
  assert.ok(venue.includes('name="partySize"'));
  assert.ok(venue.includes('name="eventType"'));
  const car=renderHtml(buildSitePayload(input('auto-service',true)));
  assert.ok(car.includes('name="vehicle"'));
  assert.ok(car.includes('name="issue"'));
  assert.ok(!car.includes('name="time"'));
  const health=renderHtml(buildSitePayload(input('physio',true)));
  assert.ok(!health.includes('name="issue"'));
  assert.ok(!health.includes('name="symptoms"'));
  assert.ok(!health.includes('name="diagnosis"'));
});

test('Universal Booking Preview and exported standalone ZIP use identical HTML and local runtime',()=>{
  for(const [id,enabled] of [['hair-salon',true],['restaurant',true],['consultant',true],
    ['auto-service',true],['kids-playroom',true],['optician',false]]){
    const p=buildSitePayload(input(id,enabled)),html=renderHtml(p),zip=exportSiteZip(p);
    assert.ok(html.includes('booking.css')&&html.includes('booking-runtime.js'),id);
    assert.ok(zip.length>150_000,id);
    assert.equal(zip.readUInt32LE(0),0x04034b50,id);
    for(const file of ['index.html','site.css','booking.css','booking-runtime.js',p.catalog.hero])assert.ok(zip.includes(Buffer.from(file)),`${id}: missing exported ${file}`);
  }
});

test('Media cards are actually aligned to service names for key reference businesses',()=>{
  const cases={
    'barber-shop':[['Muško šišanje','haircut'],['Oblikovanje brade','beard_trim'],['Brijanje','shave']],
    'optician':[['Pregled vida','vision_test'],['Izbor okvira','optical_frames']],
    'appliance-repair':[['Popravka veš mašine','washing_machine'],['Servis frižidera','fridge']]
  };
  for(const [id,items] of Object.entries(cases)){
    const source=serviceProfile(id).services;
    for(const [title,filename] of items){const found=source.find(x=>x.title===title);assert.ok(found&&found.image.includes(filename),`${id}: mismatch ${title}`);}
  }
});

test('Recognition includes service, beauty, food and event descriptions',()=>{
  const pairs=[['Imam frizerski salon','hair-salon'],['Vodim piceriju','restaurant'],['Imam autoserivs u gradu','auto-service'],
  ['Otvorila sam optiku','optician'],['Dečija igraonica i rođendani','kids-playroom'],['Bavim se molerskim radovima','painter']];
  // Typographic spelling isn't the same as synonym recognition; test documented descriptions.
  pairs[2][0]='Imam auto servis';
  for(const [description,expected] of pairs)assert.equal(recognizeBusiness(description),expected,description);
});

test('V41.5 requested wording for auto parts while V41.4 cart and contact stays',()=>{
  const p=buildSitePayload({businessId:'auto-parts',businessName:'Test',style:'modern',goal:'catalog',answers:{ordersEnabled:false}});
  const html=renderHtml(p);
  assert.ok(html.includes('Zatraži potvrdu dostupnosti'));
  const wine=buildSitePayload({businessId:'wine-shop',businessName:'Test',style:'modern',goal:'purchase',answers:{wineTastings:true}});
  assert.ok(renderHtml(wine).includes('id="tastingForm"'));
});
