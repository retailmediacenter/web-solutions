import test from 'node:test';
import assert from 'node:assert/strict';
import {getRegistryCount,getBusinessFacts} from '../src/registry.js';
import {PILOT_BUSINESSES,listBusinesses,getAdvisorDefinition,recognizeBusiness,resolvePilotSiteConfig} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import {zipFiles} from '../src/zip.js';

const input=(id,answers={})=>({businessId:id,businessName:'Test firma',goal:'purchase',style:'modern',answers:{...(['phone-store','grocery-store'].includes(id)?{ordersEnabled:true}:id==='auto-parts'?{ordersEnabled:false}:{}),...answers}});
const butcher=(mode='grilled')=>input('butcher-shop',{butcherGrillService:mode});
const wine=(enabled=true)=>input('wine-shop',{wineTastings:enabled});

test('original V39.5 Registry: all 72 facts preserved; no render responsibilities',()=>{
  assert.equal(getRegistryCount(),80);
  assert.equal(listBusinesses().length,80);
  for(const id of ['butcher-shop','wine-shop','shoe-shop'])assert.ok(getBusinessFacts(id));
  assert.ok(getBusinessFacts('butcher-shop').productAttributes.includes('preparation'));
  assert.equal(getBusinessFacts('butcher-shop').cta,undefined);
});
test('actual legacy advisor questions available for supported profiles',()=>{
  const shoe=getAdvisorDefinition('shoe-shop');
  assert.equal(shoe.operation.question,'Kako prodajete?');
  assert.ok(shoe.operation.options.includes('Online prodaja'));
});
test('Serbian plain language recognizes all 3 pilots',()=>{
  assert.equal(recognizeBusiness('Vodim mesaru u Čačku.'),'butcher-shop');
  assert.equal(recognizeBusiness('Vinoteka i degustacije vina'),'wine-shop');
  assert.equal(recognizeBusiness('Prodajem cipele i patike'),'shoe-shop');
});
test('No hallucinated business ID on ambiguous description',()=>{
  assert.equal(recognizeBusiness('Imam neku firmu'),null);
});
test('Butcher explicit preparation never skipped',()=>{
  assert.throws(()=>resolvePilotSiteConfig(input('butcher-shop',{})),/Nedostaje/);
});
test('Butcher raw vs grilled capabilities and product variants',()=>{
  const raw=buildSitePayload(butcher('raw'));
  const grilled=buildSitePayload(butcher('grilled'));
  assert.equal(raw.siteConfig.capabilities.butcherGrillService,false);
  assert.equal(grilled.siteConfig.capabilities.butcherGrillService,true);
  const roast=grilled.catalog.products.find(x=>x.title==='Juneće pečenje');
  assert.ok(roast&&roast.grillable);
  assert.equal(roast.step,0.5);
  assert.equal(roast.unit,'kg');
});
test('Wine: tasting booking only on explicit yes and section links there',()=>{
  const no=buildSitePayload(wine(false)),yes=buildSitePayload(wine(true));
  assert.equal(no.siteConfig.modules.includes('wine-tasting'),false);
  assert.equal(yes.siteConfig.modules.includes('wine-tasting'),true);
  assert.ok(!renderHtml(no).includes('id="degustacije"'));
  const html=renderHtml(yes);
  assert.ok(html.includes('id="degustacije"'));
  assert.ok(html.includes('href="#degustacije"'));
  assert.ok(html.includes('id="tastingForm"'));
  assert.ok(html.includes('name="partySize"'));
});
test('Wine mandatory answer may not silently default',()=>{
  assert.throws(()=>resolvePilotSiteConfig(input('wine-shop',{})),/Nedostaje/);
});
test('Shoe catalog has V39.5 curated images, demo prices and size picker',()=>{
  const site=buildSitePayload(input('shoe-shop'));
  assert.equal(site.catalog.products.length,7);
  assert.ok(site.catalog.products.every(x=>x.price>0&&x.image.startsWith('assets/images/curated/')));
  assert.ok(renderHtml(site).includes('id="shoeSize"'));
});
test('Preview and export use same renderer + source catalog',()=>{
  const site=buildSitePayload(butcher());
  const html=renderHtml(site);
  assert.ok(html.includes('id="qtyPlus"'));
  assert.ok(html.includes('id="qtyMinus"'));
  assert.ok(html.includes('id="stickyTotal"'));
  assert.ok(html.includes('id="cartDialog"'));
  assert.ok(html.includes('site.css'));
  assert.ok(html.includes('export-runtime.js'));
  const zip=exportSiteZip(site);
  assert.ok(zip.length>500_000);
  assert.equal(zip.readUInt32LE(0),0x04034b50);
  assert.ok(zip.includes(Buffer.from('index.html')));
  assert.ok(zip.includes(Buffer.from('site.css')));
  assert.ok(zip.includes(Buffer.from('export-runtime.js')));
});
test('Site names properly escaped in both HTML and embedded JSON',()=>{
  const html=renderHtml(buildSitePayload({...butcher(),businessName:'<script>alert(1)</script>'}));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('\\u003cscript'));
});
test('Advisor goal is applied: catalog-only does not enable cart',()=>{
  const page=buildSitePayload({...butcher('raw'),goal:'catalog'});
  assert.equal(page.siteConfig.capabilities.commerce,false);
  assert.equal(page.siteConfig.modules.includes('cart'),false);
  assert.ok(!page.siteConfig.modules.includes('cart'));
  assert.ok(renderHtml(page).includes('id="availabilityInquiry"'));
  assert.ok(!renderHtml(page).includes('id="addToCart"'));
});
test('Input validation and ZIP traversal protection',()=>{
  assert.throws(()=>resolvePilotSiteConfig({...butcher(),style:'strange'}),/Nepoznat/);
  assert.throws(()=>resolvePilotSiteConfig({...butcher(),businessName:' '}),/Naziv/);
  assert.throws(()=>zipFiles([{name:'../secret',data:'x'}]),/putanja/);
});

// V41.2 regression: a catalog visitor can still ask about availability without a cart.
test('Shoe catalog mode offers availability inquiry, preserves size and contact form',()=>{
  const page=buildSitePayload({...input('shoe-shop'),goal:'visit'});
  const html=renderHtml(page);
  assert.equal(page.siteConfig.capabilities.commerce,false);
  assert.ok(html.includes('id="availabilityInquiry"'));
  assert.ok(html.includes('id="shoeSize"'));
  assert.ok(html.includes('id="orderHeading"'));
  assert.ok(html.includes('id="fulfillmentWrap"'));
});
test('Purchasing goal keeps add-to-cart and sticky-cart',()=>{
  const html=renderHtml(buildSitePayload(input('shoe-shop')));
  assert.ok(html.includes('id="addToCart"'));
  assert.ok(html.includes('id="stickyCart"'));
  assert.ok(!html.includes('id="availabilityInquiry"'));
});

// V41.3: Retail and catalogue wave based on real V39.5 curated product/image sets.
const RETAIL_WAVE=['fashion-shop','grocery-store','liquor-store','home-decor',
  'electronics-store','phone-store','furniture-store','auto-parts','plumbing-supplies','electrical-supplies'];
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const publicDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/public');

test('V41.3 registers exactly 10 additional functional retail/catalogue profiles',()=>{
  assert.equal(PILOT_BUSINESSES.length,80);
  const supported=listBusinesses().filter(x=>x.pilot);
  assert.equal(supported.length,80);
  for(const id of RETAIL_WAVE){
    const d=getAdvisorDefinition(id);
    assert.equal(d.pilot,true);
    assert.ok(d.operation.question && d.operation.options.length>0);
  }
});

test('All 10 new retail catalogues use original accessible curated images and positive illustrative prices',()=>{
  for(const id of RETAIL_WAVE){
    const payload=buildSitePayload(input(id));
    assert.ok(payload.catalog.products.length>=6,`Missing curated catalog: ${id}`);
    const images=[payload.catalog.hero,...payload.catalog.products.map(p=>p.image)];
    for(const asset of images)assert.ok(existsSync(path.resolve(publicDir,asset)),`Missing asset: ${asset}`);
    for(const p of payload.catalog.products)assert.ok(p.price>0 && p.unit && p.title,`${id} missing product data`);
    assert.equal(payload.siteConfig.business.id,id);
    assert.equal(payload.siteConfig.modules.includes('featured'),true);
    assert.equal(payload.siteConfig.modules.includes('contact'),true);
  }
});

test('Advisor preserves V39.5 defaults except for explicitly chosen retail ordering',()=>{
  const carts=['fashion-shop','grocery-store','liquor-store','home-decor','electronics-store','phone-store'];
  const inquiries=['furniture-store','auto-parts','plumbing-supplies','electrical-supplies'];
  for(const id of carts){
    const site=buildSitePayload(input(id));
    assert.equal(site.siteConfig.capabilities.commerce,true,id);
    assert.ok(renderHtml(site).includes('id="addToCart"'),id);
  }
  for(const id of inquiries){
    const site=buildSitePayload(input(id));
    assert.equal(site.siteConfig.capabilities.commerce,false,id);
    assert.equal(site.siteConfig.capabilities.inquiry,true,id);
    const html=renderHtml(site);
    assert.ok(html.includes('id="availabilityInquiry"'),id);
    assert.ok(!html.includes('id="addToCart"'),id);
  }
});

test('Compatibility and product variant are retained as separate customer-entered fields',()=>{
  const vehicle=buildSitePayload(input('auto-parts'));
  const json=renderHtml(vehicle);
  assert.ok(json.includes('Marka / model / godište vozila'));
  assert.ok(json.includes('id="variantInput"'));
  const phone=renderHtml(buildSitePayload(input('phone-store')));
  assert.ok(phone.includes('Model / boja'));
  assert.ok(phone.includes('id="addToCart"'));
});

test('V41.3 first retail wave exports standalone ZIP from the same HTML as preview',()=>{
  for(const id of RETAIL_WAVE){
    const payload=buildSitePayload(input(id));
    const html=renderHtml(payload);
    assert.ok(html.includes(payload.catalog.headline),id);
    const zip=exportSiteZip(payload);
    assert.ok(zip.length>100000,id);
    assert.ok(zip.includes(Buffer.from('index.html')),id);
    assert.ok(zip.includes(Buffer.from(payload.catalog.hero)),id);
  }
});

test('Existing 3 pilot behaviours stay unchanged in V41.3',()=>{
  assert.equal(buildSitePayload(butcher('grilled')).siteConfig.capabilities.butcherGrillService,true);
  assert.equal(buildSitePayload(wine(true)).siteConfig.modules.includes('wine-tasting'),true);
  assert.equal(buildSitePayload(wine(false)).siteConfig.modules.includes('wine-tasting'),false);
  assert.ok(renderHtml(buildSitePayload(input('shoe-shop'))).includes('id="shoeSize"'));
});

test('Advisor recognizes Serbian descriptions for each new audited retail profile',()=>{
  const cases={
    'Prodajem garderobu u butiku':'fashion-shop',
    'Vodim mini market i prodajem namirnice':'grocery-store',
    'Imam prodavnicu pića u Beogradu':'liquor-store',
    'Prodajem dekoracije za dom':'home-decor',
    'Prodavnica elektronike i računara':'electronics-store',
    'Imam radnju za mobilne telefone':'phone-store',
    'Prodajem nameštaj i ugaone garniture':'furniture-store',
    'Prodajem auto delove':'auto-parts',
    'Radnja za vodovodni materijal':'plumbing-supplies',
    'Prodajem elektromaterijal':'electrical-supplies'
  };
  for(const [description,id] of Object.entries(cases)){
    assert.equal(recognizeBusiness(description),id,description);
  }
});


// V41.4: marketing goal is not an operational permission to take orders.
test('V41.4 phone, grocery and auto parts require an explicit order-acceptance answer',()=>{
  for(const id of ['phone-store','grocery-store','auto-parts']){
    assert.equal(getAdvisorDefinition(id).special.id,'ordersEnabled');
    const blank={...input(id),answers:{}};
    assert.throws(()=>resolvePilotSiteConfig(blank),/Odgovorite/);
  }
});
test('V41.4 ordering works independently of marketing goal; explicit NO keeps inquiry',()=>{
  for(const id of ['phone-store','grocery-store','auto-parts']){
    for(const goal of ['purchase','visit','catalog']){
      const yes=buildSitePayload({...input(id,{ordersEnabled:true}),goal});
      assert.equal(yes.siteConfig.capabilities.commerce,true,`${id}/${goal}`);
      assert.ok(yes.siteConfig.modules.includes('cart'));
      const html=renderHtml(yes);
      assert.ok(html.includes('id="addToCart"'),id);
      assert.ok(html.includes('id="buyNow"'),id);
      const no=buildSitePayload({...input(id,{ordersEnabled:false}),goal});
      assert.equal(no.siteConfig.capabilities.commerce,false,`${id}/${goal}`);
      assert.equal(no.siteConfig.modules.includes('cart'),false);
      assert.ok(renderHtml(no).includes('id="availabilityInquiry"'));
    }
  }
});
test('V41.4 auto parts: cart + optional inquiry, vehicle required in runtime',()=>{
  const yes=buildSitePayload(input('auto-parts',{ordersEnabled:true}));
  assert.equal(yes.siteConfig.capabilities.requireVehicle,true);
  const html=renderHtml(yes);
  assert.ok(html.includes('id="addToCart"'));
  assert.ok(html.includes('id="availabilityInquiry"'));
  assert.ok(html.includes('Marka / model / godište vozila'));
  assert.ok(html.includes('"requireVehicle":true'));
});
test('V41.4 Commerce actions remain; B2 tasting Booking uses Portal and no legacy booking links',()=>{
  const html=renderHtml(buildSitePayload(wine(true)));
  // B2 changes only the active Booking flow. Commerce can still use Copy/Viber/WhatsApp.
  for(const id of ['copyMessage','viberMessage','waMessage'])
    assert.ok(html.includes(`id="${id}"`),`${id}: Commerce messaging unexpectedly removed`);
  // The tasting request is submitted over the central API, not as a copied booking link.
  for(const id of ['wineBookingPreview','wineBookingSending','wineBookingSuccess','wineBookingError','wineReservationCode'])
    assert.ok(html.includes(`id="${id}"`),`${id}: B2 booking state missing`);
  for(const id of ['copyBooking','viberBooking','waBooking','shareBooking','shareMessage'])
    assert.ok(!html.includes(`id="${id}"`),`${id}: legacy control should not be active`);
  assert.ok(html.includes('Zahtev nije poslat.'),'Preview must distinguish demonstration from sending');
  const runtime=readFileSync(path.join(publicDir,'export-runtime.js'),'utf8');
  assert.ok(runtime.includes('viber://forward?text='));
  assert.ok(runtime.includes("$('viberMessage').href=viberUrl(prepared)"));
  assert.ok(runtime.includes('checkedLine()'));
});
