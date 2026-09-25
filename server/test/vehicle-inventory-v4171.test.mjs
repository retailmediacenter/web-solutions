import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import inventory from '../src/data/vehicle-inventory-demo-v395.json' with {type:'json'};
import provenance from '../src/data/v4171-vehicle-assets.json' with {type:'json'};
import {getAdvisorDefinition} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/public');
const input=(id,choice)=>({businessId:id,businessName:'Test RMC',style:'modern',goal:'purchase',answers:{ordersEnabled:true,acceptsTimeRequests:true,hybridChoice:choice}});
test('Every restored vehicle is from the original V39.5 catalog with exact source photos',()=>{
 assert.equal(inventory.products.length,10);
 assert.equal(Object.keys(provenance).length,10);
 assert.equal(new Set(inventory.products.map(x=>x.id)).size,10);
 for(const v of inventory.products){
  for(const f of ['year','mileage','fuel','gearbox','power'])assert.ok(v.fields[f],`${v.id} ${f}`);
  assert.ok(v.priceLabel.includes('€'));
  const b=readFileSync(path.join(root,v.image));
  assert.equal(b.length,provenance[v.image].bytes);
  assert.equal(createHash('sha256').update(b).digest('hex'),provenance[v.image].sha256);
 }
});
test('Only explicit hybrid selection generates vehicles, full gallery, modal, enquiry and standalone ZIP',()=>{
 for(const id of ['auto-parts','auto-service']){
  const nothing=buildSitePayload(input(id,'none'));
  assert.ok(!renderHtml(nothing).includes('vehicleDetailDialog'));
  const p=buildSitePayload(input(id,'vehicle-sales'));
  const html=renderHtml(p);const zip=exportSiteZip(p);
  assert.equal(p.secondary.products.length,10);
  assert.equal((html.match(/class="hybrid-card vehicle-card"/g)||[]).length,10);
  assert.ok(html.includes('id="vehicleDetailDialog"'));
  assert.ok(html.includes('id="vehicleSearch"'));
  assert.ok(html.includes('id="vehicleCategory"'));
  assert.ok(html.includes('Prikazana vozila i cene su ilustrativni primeri'));
  assert.ok(html.includes('name="item"'));
  for(const vehicle of p.secondary.products){
   assert.ok(html.includes(vehicle.title));
   assert.ok(html.includes(vehicle.image));
   assert.ok(zip.includes(Buffer.from(vehicle.image)));
  }
  assert.ok(zip.includes(Buffer.from('hybrid-runtime.js')));
 }
});
test('Advisor naming is product-aware: fashion retains collections, industrial retail uses products/models',()=>{
 for(const id of ['auto-parts','plumbing-supplies','electrical-supplies','phone-store','electronics-store','grocery-store']){
  const opts=getAdvisorDefinition(id).emphasis.options;
  assert.ok(!opts.join(' ').toLocaleLowerCase('sr-RS').includes('kolekcij'),`${id} must not ask about fashion collections`);
  assert.ok(opts.some(s=>s.includes('Nove')),`${id}: missing new products / models`);
 }
 assert.ok(getAdvisorDefinition('fashion-shop').emphasis.options.some(s=>s.includes('Kolekcije')));
});
