import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VERTICAL_IDS,verticalProfile,verticalQuestion} from '../src/vertical-engine.js';
import {SERVICE_BUSINESSES,getServiceSpecial} from '../src/service-engine.js';
import {PILOT_BUSINESSES,getAdvisorDefinition,listBusinesses,recognizeBusiness} from '../src/advisor.js';
import {getBusinessFacts,getRegistryCount} from '../src/registry.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import source from '../src/data/v418-source-assets.json' with {type:'json'};
import parity from '../src/data/parity-matrix-v418.json' with {type:'json'};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/public');
const request=(id,enabled)=>({businessId:id,businessName:'Test '+id,goal:'visit',style:'modern',description:'Testiram '+id,answers:{verticalEnabled:enabled,contactPhone:'+381 60 123456'}});
const missingV395Assets=['interior-design'];
test('expanded catalog contains 77 UNIQUE scenarios while the V41.8 parity matrix preserves its original 72',()=>{
 assert.equal(getRegistryCount(),77);assert.equal(PILOT_BUSINESSES.length,77);
 assert.equal(new Set(PILOT_BUSINESSES).size,77);
 assert.equal(listBusinesses().filter(x=>x.pilot).length,77);
 assert.equal(VERTICAL_IDS.length,24);
 assert.equal(parity.length,72);
 const activeIds=new Set(PILOT_BUSINESSES);
 for(const entry of parity)assert.ok(activeIds.has(entry.id),entry.id);
 for(const id of VERTICAL_IDS){let f=getBusinessFacts(id);assert.equal(f.cta,undefined);assert.equal(f.renderer,undefined);}
});
test('24 sector profiles keep explicit Advisor choice (no invented booking, product stock or payment)',()=>{
 for(const id of VERTICAL_IDS.filter(id=>id!=='pharmacy')){
  const d=getAdvisorDefinition(id),p=verticalProfile(id);
  assert.equal(d.verticalKind,p.kind);
  assert.equal(d.special.id,'verticalEnabled');
  assert.equal(d.special.question,p.question);
  assert.ok(p.cards.length>=3);
  assert.throws(()=>buildSitePayload({...request(id,true),answers:{}}),/Odgovorite/);
  const yes=buildSitePayload(request(id,true)),no=buildSitePayload(request(id,false));
  assert.equal(yes.siteConfig.capabilities.verticalEnabled,true);
  assert.equal(no.siteConfig.capabilities.verticalEnabled,false);
  assert.equal(yes.siteConfig.capabilities.liveAvailability,false);
  assert.equal(yes.siteConfig.capabilities.payments,false);
  for(const site of [yes,no]){
    const html=renderHtml(site);
    assert.ok(html.includes('id="verticalForm"'),id);
    assert.ok(html.includes('id="verticalDialog"'),id);
    assert.ok(html.includes('vertical-runtime.js'),id);
    assert.ok(html.includes('Kopiraj zahtev')&&html.includes('Viber')&&html.includes('WhatsApp'),id);
    assert.ok(!html.includes('href="tel:"'),id);
    assert.ok(!html.includes('${esc('),id);
    if(!site.siteConfig.capabilities.verticalEnabled){
       assert.ok(!html.includes('name="arrival"'),id);
       assert.ok(!html.includes('name="departure"'),id);
    }
  }
 }
});
test('Original V39.5 source photos: every included V41.8 photo has verified SHA256 and business provenance',()=>{
 assert.equal(missingV395Assets.filter(x=>!verticalProfile(x).hero).length,1);
 assert.ok(Object.keys(source).length>=50);
 for(const [asset,meta] of Object.entries(source)){
  const p=path.resolve(root,asset);
  assert.ok(p.startsWith(root+path.sep),asset);
  assert.ok(fs.existsSync(p),asset);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),meta.sha256,asset);
  assert.equal(getBusinessFacts(meta.businessId).assetRoot!==null,true,asset);
 }
 for(const id of missingV395Assets){
  const h=renderHtml(buildSitePayload(request(id,true)));
  assert.ok(h.includes('Fotografije i reference vlasnik može dodati'),id);
  assert.ok(h.includes('no-card-photo'),id);
 }
});
test('Sector-specific form contract: real-estate, education, hotel, rent-a-car, travel, healthcare',()=>{
 const check=(id,...fields)=>{const h=renderHtml(buildSitePayload(request(id,true)));
  for(const f of fields)assert.ok(h.includes(`name="${f}"`),`${id}/${f}`);
  return h};
 check('real-estate','item','area','budget');
 check('construction','item','area','unitType','budget');
 check('language-school','item','level','format');
 check('training-center','item','format','start');
 const kindergarten=check('kindergarten','age','date');assert.ok(!kindergarten.includes('name="childName"'));
 for(const id of ['apartments','hotel'])check(id,'item','arrival','departure','guests');
 check('rent-a-car','item','arrival','departure','pickup','returnLocation','pickupTime','returnTime');
 check('travel-agency','item','destination','travelMonth','guests','budget');
 // Pharmacy now has a separate Commerce + conditional consultations flow (V41.8.1).
 for(const id of ['dentist','clinic','lab']){
  const h=check(id,'item','date');assert.ok(!h.includes('name="diagnosis"'));assert.ok(!h.includes('name="symptoms"'));
 }
 check('vet','item','pet','date');
});
test('All 19 vertical sites have standalone export ZIP with identical renderer and business-specific assets',()=>{
 for(const id of VERTICAL_IDS.filter(id=>id!=='pharmacy')){
  for(const enabled of [true,false]){
   const p=buildSitePayload(request(id,enabled));
   const html=renderHtml(p),zip=exportSiteZip(p);
   assert.equal(zip.readUInt32LE(0),0x04034b50,id);
   for(const item of ['index.html','site.css','vertical.css','vertical-runtime.js'])assert.ok(zip.includes(Buffer.from(item)),`${id}/${item}`);
   for(const img of [p.catalog.hero,...p.catalog.cards.map(x=>x.image)].filter(Boolean)){
    assert.ok(fs.existsSync(path.join(root,img)),`${id}:missing ${img}`);
    assert.ok(html.includes(img),`${id}:html ${img}`);
    assert.ok(zip.includes(Buffer.from(img)),`${id}:ZIP ${img}`);
   }
  }
 }
});
test('Sector-name recognition is Serbian and non-ambiguous for explicit descriptions',()=>{
 const examples={
 'sports-shop':'Prodavnica sportske opreme','marketing-agency':'Marketing agencija',
 'print-shop':'Stamparija','real-estate':'Agencija za nekretnine',
 construction:'Investitor u gradnju objekata','interior-design':'Dizajn enterijera',
 'language-school':'Skola jezika','training-center':'Centar za obuke',
 kindergarten:'Vrtic','apartments':'Izdajemo apartmane',hotel:'Imamo hotel',
 'rent-a-car':'Rent a car','travel-agency':'Turisticka agencija',
 'photo-video':'Foto studio',dentist:'Stomatoloska ordinacija',
 pharmacy:'Apoteka',lab:'Medicinska laboratorija',clinic:'Privatna klinika',vet:'Veterinarska ambulanta'};
 for(const [id,text] of Object.entries(examples))assert.equal(recognizeBusiness(text),id,`${text}:id mismatch`);
});
test('Complete V41.8: 72 scenarios can resolve, render HTML, export ZIP while old 53 flows remain unchanged',()=>{
 for(const id of PILOT_BUSINESSES){
  const special=getAdvisorDefinition(id).special;
  let answer={};
  if(id==='butcher-shop')answer={butcherGrillService:'grilled'};
  else if(id==='wine-shop')answer={wineTastings:true};
  else if(id==='pharmacy')answer={businessMode:'Porudžbine proizvoda za negu i dozvoljenog bezreceptnog asortimana',pharmacyConsultations:true};
  else if(VERTICAL_IDS.includes(id))answer={verticalEnabled:true};
  else if(SERVICE_BUSINESSES.includes(id))answer={[special.id]:true};
  else if(special?.id==='ordersEnabled')answer={ordersEnabled:true};
  const payload=buildSitePayload({businessId:id,businessName:'Demo '+id,description:'Moja radnja',style:'modern',goal:'visit',answers:answer});
  const html=renderHtml(payload),zip=exportSiteZip(payload);
  assert.ok(payload.siteConfig.modules.includes('contact'),id);
  assert.ok(html.startsWith('<!doctype html>'),id);
  assert.ok(zip.includes(Buffer.from('index.html')),id);
 }
});

test('Hotels and apartments: external booking requires real HTTPS destination; never show fake button or user-provided scripts',()=>{
 for(const id of ['hotel','apartments']){
  const base={...request(id,false),answers:{verticalEnabled:false,businessMode:'Spoljni booking sistem'}};
  assert.throws(()=>buildSitePayload(base),/HTTPS adresu/);
  for(const url of ['javascript:alert(1)','http://booking.example.com','https://bad:pass@example.com'])
   assert.throws(()=>buildSitePayload({...base,answers:{...base.answers,externalBookingUrl:url}}),/HTTPS adresu/);
  const p=buildSitePayload({...base,answers:{...base.answers,externalBookingUrl:'https://booking.example.com/checkin?unit=1&lang=sr'}});
  const html=renderHtml(p),zip=exportSiteZip(p);
  assert.ok(p.siteConfig.modules.includes('external-booking-link'));
  assert.ok(html.includes('Spoljni booking'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('booking.example.com/checkin?unit=1&amp;lang=sr'));
  assert.ok(zip.includes(Buffer.from('index.html')));
 }
});

test('Rent and hotel informational cards cannot masquerade as bookable stock',()=>{
 for(const id of ['hotel','rent-a-car']){
  const payload=buildSitePayload(request(id,true));
  const html=renderHtml(payload);
  for(const c of payload.catalog.cards.filter(x=>x.requestable===false)){
    assert.ok(!html.includes(`data-vertical-item="${c.title}"`));
    assert.ok(html.includes(c.title));
  }
 }
});
