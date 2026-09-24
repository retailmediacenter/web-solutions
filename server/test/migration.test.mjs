import test from 'node:test';
import assert from 'node:assert/strict';
import {getRegistryCount,getBusinessFacts} from '../src/registry.js';
import {listBusinesses,getAdvisorDefinition,recognizeBusiness,resolvePilotSiteConfig} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import {zipFiles} from '../src/zip.js';

const input=(id,answers={})=>({businessId:id,businessName:'Test firma',goal:'purchase',style:'modern',answers});
const butcher=(mode='grilled')=>input('butcher-shop',{butcherGrillService:mode});
const wine=(enabled=true)=>input('wine-shop',{wineTastings:enabled});

test('original V39.5 Registry: all 72 facts preserved; no render responsibilities',()=>{
  assert.equal(getRegistryCount(),72);
  assert.equal(listBusinesses().length,72);
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
  assert.ok(renderHtml(page).includes('class="detail-buy" hidden'));
});
test('Input validation and ZIP traversal protection',()=>{
  assert.throws(()=>resolvePilotSiteConfig({...butcher(),style:'strange'}),/Nepoznat/);
  assert.throws(()=>resolvePilotSiteConfig({...butcher(),businessName:' '}),/Naziv/);
  assert.throws(()=>zipFiles([{name:'../secret',data:'x'}]),/putanja/);
});
