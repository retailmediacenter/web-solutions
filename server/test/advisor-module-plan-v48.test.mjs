import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeBusiness} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';

test('construction language is recognized without a clarification loop',()=>{
 for(const description of ['Građevina','Gradim stanove','Gradim zgrade','Izgradnja stanova','Građevinska kompanija'])assert.equal(recognizeBusiness(description),'construction');
});

test('V49 small-business additions have deterministic Serbian recognition',()=>{
 const cases={
  'Knjižara sa stranim knjigama':'bookshop',
  'Pet shop i hrana za pse':'pet-shop',
  'Šišanje pasa i pet grooming':'pet-grooming',
  'Parfimerija i kozmetika':'cosmetics-perfumery',
  'Autoprevoz i transport robe':'freight-carrier',
  'Hemijsko čišćenje i peglanje veša':'laundry-dry-cleaning',
  'Krojač i prepravke odeće':'tailor',
  'Servis bicikala i popravka bajsa':'bicycle-service'
 };
 for(const [description,id] of Object.entries(cases))assert.equal(recognizeBusiness(description),id);
});

test('every generated site records the V31–V42 library plus the optional V34.5 Commerce Controller',()=>{
 const service=buildSitePayload({businessId:'hair-salon',businessName:'Salon',answers:{acceptsTimeRequests:true}}).siteConfig;
 const construction=buildSitePayload({businessId:'construction',businessName:'Gradnja',answers:{verticalEnabled:true}}).siteConfig;
 const furniture=buildSitePayload({businessId:'furniture-store',businessName:'Salon',goal:'catalog',answers:{ordersEnabled:false}}).siteConfig;
 for(const site of [service,construction]){
  assert.equal(site.modulePlan.library.length,13);
  assert.deepEqual(site.modulePlan.library.map(x=>x.version),['V31','V32','V33','V34.5','V34','V35','V36','V37','V38','V39','V40','V41','V42']);
  assert.ok(site.modulePlan.active.includes('hero'));
  assert.ok(site.modulePlan.active.includes('contact'));
 }
 assert.ok(service.modulePlan.active.includes('booking'));
 assert.ok(!construction.modulePlan.active.includes('booking'));
 assert.ok(!service.modulePlan.active.includes('reviews'),'reviews are not invented by a sector label');
 assert.equal(service.modulePlan.library.find(x=>x.id==='reviews').state,'available');
 assert.equal(construction.modulePlan.library.find(x=>x.id==='booking').state,'locked');
 assert.ok(furniture.modulePlan.active.includes('commerce-controller'));
 assert.ok(furniture.modulePlan.active.indexOf('featured')<furniture.modulePlan.active.indexOf('commerce-controller'));
 assert.ok(furniture.modulePlan.active.indexOf('commerce-controller')<furniture.modulePlan.active.indexOf('catalog'));
});
