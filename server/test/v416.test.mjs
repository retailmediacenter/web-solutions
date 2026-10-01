import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {getBusinessFacts,getRegistryCount} from '../src/registry.js';
import {PILOT_BUSINESSES,getAdvisorDefinition,listBusinesses,recognizeBusiness} from '../src/advisor.js';
import {SERVICE_BUSINESSES,bookingFields,getServiceSpecial} from '../src/service-engine.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import sourceManifest from '../src/data/v416-image-source-manifest.json' with {type:'json'};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/public');
const retail=['bakery','pastry','fast-food','gift-shop'];
const services=['catering','car-wash','cleaning','locksmith','moving','property-manager',
  'software-company','it-support','security-systems','fitness-center','fitness-trainer','yoga-pilates'];
const serviceRequest=(id,enabled)=>({businessId:id,businessName:'Primer '+id,
  style:'modern',goal:'visit',description:'Imam '+id,answers:{[getServiceSpecial(id).id]:enabled}});
const retailRequest=(id,enabled,goal='visit')=>({businessId:id,businessName:'Primer '+id,
  style:'modern',goal,description:'Prodajem '+id,answers:{ordersEnabled:enabled}});

test('V41.6 preserves 72 data-only fact entries and covers 72 distinct functional scenarios after V41.8',()=>{
  assert.equal(getRegistryCount(),80);
  assert.equal(new Set(PILOT_BUSINESSES).size,72);
  assert.equal(listBusinesses().filter(x=>x.pilot).length,72);
  assert.equal(SERVICE_BUSINESSES.length,36);
  for(const id of [...retail,...services]){
    const f=getBusinessFacts(id),a=getAdvisorDefinition(id);
    assert.ok(f?.assetRoot,`Missing original namespace ${id}`);
    assert.equal(f.renderer,undefined);
    assert.equal(f.cta,undefined);
    assert.equal(f.bookingMode,undefined);
    assert.ok(a.special?.options?.length===2,`Missing explicit capability question: ${id}`);
  }
});

test('V41.6 food/flower ordering depends on explicit answer, NOT marketing goal',()=>{
  for(const id of retail){
    assert.equal(getAdvisorDefinition(id).special.id,'ordersEnabled');
    for(const goal of ['purchase','visit','catalog']){
      assert.throws(()=>buildSitePayload({...retailRequest(id,true,goal),answers:{}}),/Odgovorite/);
      for(const enabled of [true,false]){
        const p=buildSitePayload(retailRequest(id,enabled,goal));
        assert.equal(p.siteConfig.capabilities.commerce,enabled,`${id}:${goal}:${enabled}`);
        const html=renderHtml(p);
        assert.ok(html.includes(enabled?'id="addToCart"':'id="availabilityInquiry"'),id);
        assert.ok(html.includes('export-runtime.js'));
        assert.ok(p.catalog.products.length>=3);
        assert.ok(p.catalog.products.every(x=>x.price>0&&x.unit&&x.title));
      }
    }
  }
});

test('V41.6 each new service respects yes/no, has valid dropdown options and clickable card mapping',()=>{
  for(const id of services){
    const special=getServiceSpecial(id);
    assert.ok(special.question, id);
    for(const enabled of [true,false]){
      const p=buildSitePayload(serviceRequest(id,enabled));
      const html=renderHtml(p);
      assert.equal(p.siteConfig.capabilities.booking.enabled,enabled,id);
      assert.equal(html.includes('id="zakazivanje"'),enabled,id);
      assert.ok(html.includes('id="requestForm"'),id);
      assert.ok(html.includes('booking-runtime.js'));
      assert.ok(!html.includes('data-service="${'),id);
      assert.ok(!html.includes('<option value="${'),id);
      if(!enabled)assert.ok(!html.includes('name="date"'),id);
      for(const s of p.catalog.services){
        const safe=s.title.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        assert.ok(html.includes(`data-service="${safe}"`)||p.siteConfig.capabilities.booking.mode==='reservation',`${id}/${s.title}: card mismatch`);
      }
    }
  }
});

test('Catering captures event, headcount and venue; moving captures BOTH locations',()=>{
  const food=renderHtml(buildSitePayload(serviceRequest('catering',true)));
  for(const field of ['partySize','eventType','location','date','time'])assert.ok(food.includes(`name="${field}"`),field);
  const moving=renderHtml(buildSitePayload(serviceRequest('moving',true)));
  for(const field of ['issue','location','destination','date','daypart'])assert.ok(moving.includes(`name="${field}"`),field);
  const mode=bookingFields('moving','request-slot');assert.equal(mode.destination,true);
  const runtime=readFileSync(path.join(root,'booking-runtime.js'),'utf8');
  assert.ok(runtime.includes('destination:\'Odredište\''));
  assert.ok(runtime.includes("'location','destination','date'"));
});

test('All new original V39.5 photos exist and their SHA-256 provenance is recorded',async()=>{
  const {createHash}=await import('node:crypto');
  assert.ok(Object.keys(sourceManifest).length>=50);
  for(const [file,meta] of Object.entries(sourceManifest)){
    const abs=path.resolve(root,file);
    assert.ok(abs.startsWith(root+path.sep));
    assert.ok(existsSync(abs),file);
    assert.equal(createHash('sha256').update(readFileSync(abs)).digest('hex'),meta.sha256,file);
  }
  // V39.5 registry namespace contains a literal space. Preview/ZIP receive a
  // URI-safe copy; the original data-only business fact is unmodified.
  assert.ok(getBusinessFacts('fast-food').assetRoot.includes('fast food'));
  const fast=buildSitePayload(retailRequest('fast-food',true));
  assert.ok(!fast.catalog.hero.includes(' '));
});

test('Standalone ZIP includes everything referenced by preview HTML for all 16 new cases',()=>{
  for(const id of [...retail,...services]){
    const p=retail.includes(id)?buildSitePayload(retailRequest(id,true)):buildSitePayload(serviceRequest(id,true));
    const html=renderHtml(p),zip=exportSiteZip(p);
    assert.ok(zip.length>120000,id);
    for(const text of ['index.html','site.css',p.catalog.hero])assert.ok(zip.includes(Buffer.from(text)),`${id}: ZIP missing ${text}`);
    if(services.includes(id))assert.ok(zip.includes(Buffer.from('booking-runtime.js')));
    for(const asset of (p.catalog.products||p.catalog.services).map(x=>x.image)){
      assert.ok(existsSync(path.resolve(root,asset)),`${id}: missing ${asset}`);
      assert.ok(html.includes(asset),`${id}: HTML missing ${asset}`);
      assert.ok(zip.includes(Buffer.from(asset)),`${id}: ZIP missing ${asset}`);
    }
  }
});

test('Serbian descriptions cover new retail and service IDs without changing legacy recognition',()=>{
 const examples={
  bakery:'Otvorio sam pekaru u kraju',pastry:'Imam poslastičarnicu',
  'fast-food':'Otvaram brzu hranu', 'gift-shop':'Imam cvećaru i poklon pakete',
  catering:'Imamo ketering za firme','car-wash':'Vodim auto perionicu',
  cleaning:'Servis za čišćenje poslovnog prostora',locksmith:'Radimo bravarske radove',
  moving:'Organizujemo selidbe','property-manager':'Ja sam profesionalni upravnik zgrada',
  'software-company':'Mi smo softverska agencija','it-support':'Nudimo IT podršku',
  'security-systems':'Instaliramo video nadzor','fitness-center':'Fitness centar',
  'fitness-trainer':'Ja sam personalni trener','yoga-pilates':'Imamo pilates studio'};
 for(const [id,text] of Object.entries(examples))assert.equal(recognizeBusiness(text),id,`${text}: recognition`);
 for(const [text,id] of [['Imam frizerski salon','hair-salon'],['Imam mesaru','butcher-shop'],['Prodajem cipele','shoe-shop']])
   assert.equal(recognizeBusiness(text),id);
});
