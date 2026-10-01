import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import hairSources from '../src/data/v417-image-source-manifest.json' with {type:'json'};
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getHybridQuestion,supportedHybridPairs} from '../src/hybrid-engine.js';
import {getBusinessFacts,getRegistryCount} from '../src/registry.js';
import {getAdvisorDefinition,recognizeBusiness} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/public');
const pairs=supportedHybridPairs();
function req(id,choice='none'){
 const serviceIds=new Set(['auto-service','repair-phone','hair-salon']);
 const retailOrderIds=new Set(['auto-parts','phone-store']);
 return {businessId:id,businessName:'Test RMC & Sinovi',style:'modern',goal:'purchase',description:'Lokalna kombinovana delatnost',
   answers:{...(serviceIds.has(id)?{acceptsTimeRequests:true}:{}),...(retailOrderIds.has(id)?{ordersEnabled:true}:{}),hybridChoice:choice}};
}
test('Natural Serbian descriptions recognize existing primary before asking the hybrid question',()=>{
 assert.equal(recognizeBusiness('Imam vodoopremu i majstore'),'plumbing-supplies');
 assert.equal(recognizeBusiness('Prodajemo auto delove i vozila'),'auto-parts');
 assert.equal(recognizeBusiness('Auto servis i prodaja vozila'),'auto-service');
});
test('V41.7: hybrid options belong to Advisor, never fact-only Business Registry',()=>{
 assert.equal(getRegistryCount(),80);
 assert.equal(pairs.length,10);
 for(const pair of pairs){
  const fact=getBusinessFacts(pair.primary);
  assert.ok(fact);
  assert.equal(fact.hybrid,undefined);
  assert.equal(fact.cta,undefined);
  assert.ok(getHybridQuestion(pair.primary).options.some(o=>o.id===pair.secondary));
  assert.equal(getAdvisorDefinition(pair.primary).hybrid.id,'hybridChoice');
 }
 for(const id of ['wine-shop','butcher-shop','shoe-shop','restaurant'])assert.equal(getAdvisorDefinition(id).hybrid,null);
});
test('Every option emits exactly 1 explicitly chosen compatible secondary module',()=>{
 for(const {primary,secondary,kind} of pairs){
  const payload=buildSitePayload(req(primary,secondary));
  const hybrid=payload.siteConfig.capabilities.hybrid;
  assert.equal(hybrid.primaryId,primary);
  assert.equal(hybrid.secondaryId,secondary);
  assert.equal(hybrid.kind,kind);
  assert.equal(hybrid.confirmation,'request');
  assert.equal(payload.secondary.type,kind);
  assert.equal(payload.siteConfig.modules.filter(x=>x.startsWith('hybrid-')).length,1);
  assert.equal(payload.siteConfig.modules.at(-1),'contact');
  const html=renderHtml(payload);
  for(const token of ['id="dodatna-delatnost"','id="hybridForm"','id="hybridDialog"','hybrid.css','hybrid-runtime.js','href="#dodatna-delatnost"'])
   assert.ok(html.includes(token),primary+'/'+secondary+' missing '+token);
  assert.equal((html.match(/id="dodatna-delatnost"/g)||[]).length,1);
  assert.ok(!html.includes('href="/api/'), 'standalone site must not call generator');
 }
});
test('Explicit NO keeps existing site and contains zero secondary runtime and assets',()=>{
 for(const id of new Set(pairs.map(x=>x.primary))){
  const no=buildSitePayload(req(id,'none'));
  assert.equal(no.siteConfig.capabilities.hybrid,undefined);
  assert.equal(no.secondary,undefined);
  assert.equal(no.siteConfig.modules.some(m=>m.startsWith('hybrid-')),false);
  const html=renderHtml(no);
  assert.ok(!html.includes('id="hybridForm"'));
  assert.ok(!html.includes('hybrid-runtime.js'));
 }
});
test('Unsupported combinations rejected, no arbitrary business pairing',()=>{
 for(const id of ['plumbing-supplies','auto-parts','hair-salon'])
  assert.throws(()=>buildSitePayload(req(id,'wine-shop')),/Nepodržana/);
 assert.throws(()=>buildSitePayload({...req('butcher-shop','plumber'),answers:{hybridChoice:'plumber',butcherGrillService:'raw'}}),/hibrid nije dostupan/);
});
test('Original V39.5 demo vehicle catalog is visible and clearly labelled as illustrative, no fake checkout',()=>{
 for(const id of ['auto-parts','auto-service']){
  const payload=buildSitePayload(req(id,'vehicle-sales'));
  const html=renderHtml(payload);
  assert.equal(payload.secondary.demoOnly,true);
  assert.equal(payload.secondary.products.length,10);
  assert.ok(html.includes('PRIMER'));
  assert.ok(html.includes('id="vehicleInventory"'));
  assert.ok(html.includes('id="vehicleDetailDialog"'));
  assert.ok(html.includes('Izaberite...'));
  assert.ok(html.includes('specifikacije su ilustrativni'));
  for(const v of payload.secondary.products)assert.ok(html.includes(v.image),v.image);
  for(const field of ['vehicle','budget','item','name','phone'])assert.ok(html.includes(`name="${field}"`),field);
  assert.ok(!html.includes('data-vehicle-checkout'));
 }
});
test('Hybrid service request carries real legacy offerings, optional contact and schedule',()=>{
 for(const pair of pairs.filter(x=>x.kind==='service')){
  const payload=buildSitePayload(req(pair.primary,pair.secondary));
  const html=renderHtml(payload);
  for(const field of ['item','issue','date','daypart','name','phone'])assert.ok(html.includes(`name="${field}"`),`${pair.primary}/${pair.secondary}: ${field}`);
  for(const service of payload.secondary.services.slice(0,3))assert.ok(html.includes(service.title),service.title);
  assert.ok(!html.includes('data-hybrid-item="${'));
  if(pair.secondary==='auto-service')assert.ok(html.includes('name="vehicle"'));
 }
});
test('Secondary products stay separate from primary order/cart, no invented prices',()=>{
 for(const pair of pairs.filter(x=>x.kind==='products')){
  const payload=buildSitePayload(req(pair.primary,pair.secondary));
  const html=renderHtml(payload);
  assert.ok(html.includes('Sekundarni katalog nije dodat u glavnu korpu.'));
  for(const p of payload.secondary.products){
   assert.ok(existsSync(path.join(root,p.image)),p.image);
   assert.ok(html.includes(p.title));
  }
  assert.ok(html.includes('name="quantity"'));
  assert.ok(payload.siteConfig.capabilities.serviceProfile ? html.includes('booking-runtime.js'):html.includes('export-runtime.js'));
 }
});
test('Hybrid preview and standalone export share HTML, styles, scripts and every source photo',()=>{
 for(const pair of pairs){
  const payload=buildSitePayload(req(pair.primary,pair.secondary));
  const html=renderHtml(payload),zip=exportSiteZip(payload);
  assert.ok(zip.readUInt32LE(0)===0x04034b50);
  for(const file of ['index.html','site.css','hybrid.css','hybrid-runtime.js'])assert.ok(zip.includes(Buffer.from(file)),file);
  const imgs=pair.kind==='service'?payload.secondary.services.map(x=>x.image):['products','vehicles'].includes(pair.kind)?payload.secondary.products.map(x=>x.image):[];
  for(const img of imgs.slice(0,pair.kind==='service'?3:pair.kind==='vehicles'?10:4)){assert.ok(html.includes(img),img);assert.ok(zip.includes(Buffer.from(img)),img);}
 }
});
test('Four hair-care photos preserve exact V39.5 bytes and documented hashes',()=>{
 assert.equal(Object.keys(hairSources).length,4);
 for(const [rel,meta] of Object.entries(hairSources)){
  const full=path.join(root,rel);assert.ok(existsSync(full),rel);
  const blob=readFileSync(full);assert.equal(blob.length,meta.bytes);
  assert.equal(createHash('sha256').update(blob).digest('hex'),meta.sha256);
 }
});
test('Hybrid JSON is escaped and UI runtime avoids literal template expressions',()=>{
 const payload=buildSitePayload({...req('phone-store','repair-phone'),businessName:'<img src=x onerror=alert(1)>'});
 const html=renderHtml(payload);
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
 assert.ok(html.includes('&lt;img'));
 assert.ok(html.includes('\\u003cimg'));
 for(const name of ['hybrid-runtime.js','hybrid.css'])assert.ok(existsSync(path.join(root,name)));
 const script=readFileSync(path.join(root,'hybrid-runtime.js'),'utf8');
 assert.ok(script.includes('data-hybrid-item'));
 assert.ok(script.includes('navigator.clipboard'));
 assert.ok(script.includes('viber://forward?text='));
});
