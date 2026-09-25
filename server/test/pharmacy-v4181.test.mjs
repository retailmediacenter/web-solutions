import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import {getAdvisorDefinition} from '../src/advisor.js';
import {getBusinessFacts} from '../src/registry.js';
const options=['Porudžbine proizvoda za negu i dozvoljenog bezreceptnog asortimana','Katalog proizvoda i upiti o dostupnosti'];
const input=(mode,consult,goal='visit')=>({businessId:'pharmacy',businessName:'Apoteka 123',goal,style:'modern',description:'Apoteka',answers:{businessMode:options[mode],pharmacyConsultations:consult,contactPhone:'+381 60 444 999'}});
test('Advisor has independent shop choice and conditional consultation; registry stays facts-only',()=>{
 const d=getAdvisorDefinition('pharmacy');
 assert.deepEqual(d.operation.options,options);
 assert.equal(d.special.id,'pharmacyConsultations');
 assert.equal(getBusinessFacts('pharmacy').renderer,undefined);
 assert.equal(getBusinessFacts('pharmacy').cta,undefined);
 assert.throws(()=>buildSitePayload({...input(0,true),answers:{businessMode:options[0]}}),/savetovanje/);
 assert.throws(()=>buildSitePayload({...input(0,true),answers:{pharmacyConsultations:true}}),/način/);
});
test('Shop/availability and consultation are genuinely independent, regardless of primary marketing goal',()=>{
 for(const goal of ['purchase','visit','catalog'])for(const mode of [0,1])for(const consultation of [true,false]){
  const p=buildSitePayload(input(mode,consultation,goal)),c=p.siteConfig;
  const h=renderHtml(p),z=exportSiteZip(p);
  assert.equal(c.capabilities.commerce,mode===0);
  assert.equal(c.capabilities.pharmacyConsultations,consultation);
  assert.equal(c.modules.includes('cart'),mode===0);
  assert.equal(c.modules.includes('pharmacy-consultation'),consultation);
  assert.ok(h.includes('id="catalogGrid"')&&h.includes('id="productDialog"')&&h.includes('id="availabilityInquiry"'));
  assert.ok(h.includes('id="addToCart"')===(mode===0));
  assert.ok(h.includes('id="pharmacyConsultForm"')===consultation);
  assert.ok(h.includes('href="#savetovanje"')===consultation);
  assert.ok(h.includes('src="pharmacy-consult-runtime.js"')===consultation);
  assert.ok(z.includes(Buffer.from('index.html')));
  assert.ok(z.includes(Buffer.from('pharmacy-consult-runtime.js'))===consultation);
  assert.ok(!h.includes('name="diagnosis"')&&!h.includes('name="symptoms"')&&!h.includes('name="prescription"'));
 }
});
test('Pharmacy demo includes real curated product photos with ONLY illustrative prices and independent consultation',()=>{
 const p=buildSitePayload(input(0,true));
 assert.equal(p.catalog.products.length,3);
 assert.ok(p.catalog.products.every(x=>x.price>0&&x.image.startsWith('assets/images/curated/healthcare/pharmacy/')));
 const html=renderHtml(p);const zip=exportSiteZip(p);
 for(const prod of p.catalog.products){assert.ok(html.includes(prod.image));assert.ok(zip.includes(Buffer.from(prod.image)));}
 assert.ok(html.includes('ilustrativne')&&html.includes('data-system="demoBadge"'));
});
